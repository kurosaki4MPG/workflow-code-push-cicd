# GitHub 側でエラーを止める CI/CD 学習

このリポジトリは、TypeScript のサンプルコードに意図的なエラーを入れたときに、GitHub 側の仕組みで push や merge を止める流れを学ぶためのものです。

## 目的

- ローカル hook ではなく GitHub Actions と ruleset で制御する
- コンパイルエラーがあるコードを merge させない
- `main` への直接 push を拒否する

## 構成

- `src/index.ts`
  - TypeScript のサンプルコード
  - わざと型エラーを入れることで CI が失敗することを確認できる
- `.github/workflows/ci.yml`
  - `npm ci` のあとに `npm run check` を実行する
  - `tsc` のエラーがあると workflow が失敗する
- GitHub ruleset
  - `main` を保護する
  - 必須 status check として `build` を指定する
  - `Restrict updates` を有効にして direct push を止める

## GitHub Actions の設定

GitHub Actions は、リポジトリに `.github/workflows/ci.yml` を置くことで有効になります。  
まずは Repository の `Settings` ではなく、コード側に workflow ファイルを作成します。

1. リポジトリのルートに `.github/workflows` ディレクトリを作る
2. その中に `ci.yml` を作る
3. `push` と `pull_request` をトリガーにする
4. `actions/checkout` でソースを取得する
5. `actions/setup-node` で Node.js をセットアップする
6. `npm ci` で依存関係を入れる
7. `npm run check` で TypeScript のコンパイルチェックを行う

このサンプルでは、workflow の job 名を `build` にしています。  
ruleset 側で必須 status check を設定するとき、この `build` を選びます。

## `ci.yml` の作成方法

このリポジトリの `ci.yml` は、次の内容です。

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npm run check
```

作成時のポイントは次の通りです。

- `name: CI`
  - GitHub 上で workflow 名として表示される
- `on: push` と `on: pull_request`
  - push と PR の両方で検査する
- `build`
  - ruleset で必須 status check にする対象名
- `npm ci`
  - `package-lock.json` に基づいて再現性のあるインストールを行う
- `npm run check`
  - `tsc` の失敗をそのまま GitHub Actions の失敗にする

## GitHub Actions を有効にしたあとに確認すること

1. 変更をコミットして push する
2. GitHub の `Actions` タブで workflow が動くことを確認する
3. `src/index.ts` に型エラーを入れて再度 push する
4. workflow が失敗することを確認する
5. ruleset で `build` が必須 status check になっていることを確認する

## GitHub ruleset の設定方法

このリポジトリでは、`main` への直接 push と、エラーのある変更の merge を GitHub 側で止めるために branch ruleset を使います。  
`push ruleset` ではなく **branch ruleset** を作るのがポイントです。

1. GitHub で対象リポジトリを開く
2. `Settings` を開く
3. 左メニューの `Rulesets` から `Rulesets` を開く
4. `New ruleset` を押す
5. `New branch ruleset` を選ぶ
6. `Ruleset name` に分かりやすい名前を入れる
7. `Enforcement status` を `Active` にする
8. `Target branches` の `Include by pattern` で `main` と入力する
9. `Branch rules` で次を有効にする（すでに有効になっている項目はそのまま）
   - `Require a pull request before merging`
   - `Require status checks to pass`
     - `Require branches to be up to date before merging`
   - `Block force pushes`
   - `Restrict deletions`
10. `Require status checks to pass` の `Add checkes` で `build` を指定する
11. 必要なら `Require branches to be up to date before merging` を有効にする
12. `Bypass list` に不要な権限が入っていないか確認する
13. `Create` を押して保存する

### 設定の意味

- `Restrict updates`
  - `main` への直接 push を止める
- `Require a pull request before merging`
  - `main` への反映を PR 経由にする
- `Require status checks to pass`
  - `build` が成功するまで実行を止める
- `Require branches to be up to date before merging`
  - base branch の最新内容を取り込んだ状態で merge させる
- `Block force pushes`
  - 強制 push を防ぐ
- `Restrict deletions`
  - ブランチ削除を防ぐ

### うまく止まらないときの確認点

1. ruleset が `Active` になっているか
2. 対象ブランチが `main` になっているか
3. `Bypass list` に自分が入っていないか
4. `build` が workflow の job 名と一致しているか
5. `push ruleset` を作っていないか

### 期待される結果

- `main` への direct push は拒否される
- PR は作成できる
- `build` が失敗している PR は merge できない
- `build` が成功しない限り、`main` に反映されない

## 期待される関係

- `ci.yml` が `npm run check` を実行する
- `npm run check` が TypeScript のコンパイル結果を返す
- エラーがあると workflow の `build` が失敗する
- ruleset が `build` の成功を要求する
- その結果、エラーのあるコードは `main` に入らない

## 使い方

1. 依存関係を入れる

```bash
npm install
```

2. 型チェックを実行する

```bash
npm run check
```

3. `src/index.ts` をわざと壊す

```ts
role: "manager",
```

4. `git push` する
   
   - GitHub Actions が失敗する
   - ruleset により `main` への反映が止まる

5. エラーを直して再実行する
   
   - `npm run check` が通ることを確認する
   - そのあと push して Actions が成功することを確認する

## 学習ポイント

- `npm run check` はローカルでの型エラー検出
- GitHub Actions は push 後に走る自動検査
- ruleset は `main` への反映を制御する本体
- direct push を止めたい場合は `Require a pull request before merging` だけでは不十分で、`Restrict updates` が必要

## 期待される挙動

- 変更を壊すと `npm run check` が失敗する
- 壊れたまま push すると GitHub Actions が失敗する
- `main` に直接 push しようとすると ruleset で拒否される
- PR 経由でも status check が通らないと merge できない

## 注意

- ローカル hook は使っていない
- GitHub 側で止めたいなら、設定は repository の `Rulesets` に集約する
- `build` という status check 名は workflow の job 名と合わせる
