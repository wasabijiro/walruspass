.PHONY: build test publish init-listing list mint view clean help

# 変数定義
PACKAGE_ID ?= 0x7e3e499f45fd674b9812081190923e04c15bf7f95f28290ce3a61ff3a2568700
LISTING_ID ?= 0x12657ef1af4a818c8fe152f211a4631416c6d826680859507cb51faed6366b4c
COIN_ID ?= 0x663d3e6db280c135ad66018c2ea700482ca73e1d5a238008d56b141ef340d9d0
NFT_INDEX ?= 0 # デフォルトは最初のNFT
PRICE ?= 100000000 # デフォルト価格 0.1 SUI
BLOB_ID ?= test_blob_id # ダブルクォート削除
NFT_NAME ?= Test_NFT # スペースをアンダースコアに
NFT_DESCRIPTION ?= This_is_a_test_NFT # スペースをアンダースコアに
RECIPIENT ?= # 送信先アドレス
GAS_BUDGET = 100000000

# ヘルプコマンド
help:
	@echo "NFT GateKeeper コマンドヘルパー"
	@echo ""
	@echo "使用方法:"
	@echo "  make build        - パッケージをビルドする"
	@echo "  make test         - テストを実行する"
	@echo "  make publish      - パッケージをテストネットに発行する"
	@echo "  make init-listing - Listingを初期化する"
	@echo "  make list         - NFTをリストに追加する"
	@echo "  make list-with-args PRICE=2000000000 NFT_NAME=\"My NFT\" - カスタム情報でNFTをリストする"
	@echo "  make mint         - NFTを購入する"
	@echo "  make mint-with-args NFT_INDEX=1 - 指定したインデックスのNFTを購入する"
	@echo "  make view         - Listingオブジェクトを表示する"
	@echo "  make view-nft     - NFTオブジェクトを表示する"
	@echo "  make clean        - ビルドファイルを削除する"
	@echo ""
	@echo "環境変数:"
	@echo "  PACKAGE_ID  - 発行したパッケージのID"
	@echo "  LISTING_ID  - 作成したListingオブジェクトのID"
	@echo "  COIN_ID     - 支払いに使用するSUIコインオブジェクトのID"
	@echo "  NFT_INDEX   - 対象NFTのインデックス（デフォルト: 0）"
	@echo "  PRICE       - NFTの価格（デフォルト: 0.1 SUI）"
	@echo "  NFT_NAME    - NFTの名前"
	@echo "  NFT_DESCRIPTION - NFTの説明"
	@echo "  BLOB_ID     - NFTのblobID"

# ビルド
build:
	@echo "パッケージをビルドしています..."
	sui move build

# テスト
test:
	@echo "テストを実行しています..."
	sui move test

# パッケージの発行
publish:
	@echo "パッケージをテストネットに発行しています..."
	sui client publish --gas-budget $(GAS_BUDGET)
	@echo "発行が完了したら、PACKAGE_ID環境変数を設定してください。"

# Listingの初期化
init-listing:
	@if [ -z "$(PACKAGE_ID)" ]; then \
		echo "エラー: PACKAGE_ID変数が設定されていません。"; \
		echo "使用方法: make init-listing PACKAGE_ID=0x123..."; \
		exit 1; \
	fi
	@echo "Listingを初期化しています..."
	sui client call --package $(PACKAGE_ID) \
		--module gatekeeper \
		--function init_listing \
		--gas-budget $(GAS_BUDGET)

# NFTのリスト
list:
	@if [ -z "$(PACKAGE_ID)" ] || [ -z "$(LISTING_ID)" ]; then \
		echo "エラー: 必要な変数が設定されていません。"; \
		echo "使用方法: make list PACKAGE_ID=0x123... LISTING_ID=0x456..."; \
		exit 1; \
	fi
	@echo "NFTをリストに追加しています..."
	sui client call --package $(PACKAGE_ID) \
		--module gatekeeper \
		--function list_nft \
		--args $(LISTING_ID) $(PRICE) $(BLOB_ID) $(NFT_NAME) $(NFT_DESCRIPTION) \
		--gas-budget $(GAS_BUDGET)

# NFTの購入（mint）
mint:
	@if [ -z "$(PACKAGE_ID)" ] || [ -z "$(LISTING_ID)" ] || [ -z "$(COIN_ID)" ]; then \
		echo "エラー: 必要な変数が設定されていません。"; \
		echo "使用方法: make mint PACKAGE_ID=0x123... LISTING_ID=0x456... COIN_ID=0x789..."; \
		exit 1; \
	fi
	@echo "NFTを購入しています..."
	sui client call --package $(PACKAGE_ID) \
		--module gatekeeper \
		--function mint_nft \
		--type-args 0x2::sui::SUI \
		--args $(LISTING_ID) $(NFT_INDEX) $(COIN_ID) \
		--gas-budget $(GAS_BUDGET)

# Listingオブジェクトの表示
view:
	@if [ -z "$(LISTING_ID)" ]; then \
		echo "エラー: LISTING_ID変数が設定されていません。"; \
		echo "使用方法: make view LISTING_ID=0x123..."; \
		exit 1; \
	fi
	@echo "Listingオブジェクトを表示しています..."
	sui client object $(LISTING_ID)

# NFTオブジェクトの表示
view-nft:
	@if [ -z "$(NFT_ID)" ]; then \
		echo "エラー: NFT_ID変数が設定されていません。"; \
		echo "使用方法: make view-nft NFT_ID=0x123..."; \
		exit 1; \
	fi
	@echo "NFTオブジェクトを表示しています..."
	sui client object $(NFT_ID)

# クリーンアップ
clean:
	@echo "ビルドファイルを削除しています..."
	rm -rf build/
