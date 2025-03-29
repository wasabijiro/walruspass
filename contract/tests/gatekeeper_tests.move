/*
#[test_only]
module contract::contract_tests;
// uncomment this line to import the module
// use contract::contract;

const ENotImplemented: u64 = 0;

#[test]
fun test_contract() {
    // pass
}

#[test, expected_failure(abort_code = ::contract::contract_tests::ENotImplemented)]
fun test_contract_fail() {
    abort ENotImplemented
}
*/

#[test_only]
module contract::gatekeeper_tests {
    // テスト対象のモジュールをインポート
    use contract::gatekeeper;
    // テストに必要なモジュール
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_scenario as ts;
    use sui::test_utils::assert_eq;
    use std::vector;

    // テスト用アドレス
    const ADMIN: address = @0xA11CE;
    const BUYER: address = @0xB0B;
    const PRICE: u64 = 1_000_000_000; // 1 SUI

    // エラーコード
    const EInvalidPrice: u64 = 1;

    // NFT作成用のテストデータ
    const NFT_NAME: vector<u8> = b"Test NFT";
    const NFT_DESCRIPTION: vector<u8> = b"This is a test NFT";
    const BLOB_ID: vector<u8> = b"test_blob_id";

    #[test]
    fun test_create_listing_and_list_nft() {
        // テストシナリオの開始 - mutキーワードを追加
        let mut scenario = ts::begin(ADMIN);
        
        // 1. Listingの初期化テスト
        {
            gatekeeper::init_listing(ts::ctx(&mut scenario));
        };
        
        // 次のトランザクションへ
        ts::next_tx(&mut scenario, ADMIN);
        
        // 2. NFTのリスト（出品）テスト
        {
            // 前のトランザクションで作成したListingを取得 - mutキーワードを追加
            let mut listing = ts::take_from_sender<gatekeeper::Listing>(&scenario);
            
            // NFT数が0であることを確認
            assert_eq(gatekeeper::get_nft_count(&listing), 0);
            
            // NFTをリストに追加
            gatekeeper::list_nft(
                &mut listing,
                PRICE,
                BLOB_ID,
                NFT_NAME,
                NFT_DESCRIPTION,
                ts::ctx(&mut scenario)
            );
            
            // NFT数が1になったことを確認
            assert_eq(gatekeeper::get_nft_count(&listing), 1);
            
            // Listingを返却
            ts::return_to_sender(&scenario, listing);
        };
        
        // テストシナリオの終了
        ts::end(scenario);
    }

    #[test]
    fun test_mint_nft() {
        // テストシナリオの開始 - mutキーワードを追加
        let mut scenario = ts::begin(ADMIN);
        
        // 1. Listingの初期化と準備
        {
            gatekeeper::init_listing(ts::ctx(&mut scenario));
        };
        
        // 次のトランザクションへ
        ts::next_tx(&mut scenario, ADMIN);
        
        // 2. NFTのリスト（出品）
        {
            let mut listing = ts::take_from_sender<gatekeeper::Listing>(&scenario);
            
            gatekeeper::list_nft(
                &mut listing,
                PRICE,
                BLOB_ID,
                NFT_NAME,
                NFT_DESCRIPTION,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, listing);
        };
        
        // 次のトランザクションは購入者として実行
        ts::next_tx(&mut scenario, BUYER);
        
        // 3. NFTの購入（mint）テスト
        {
            let mut listing = ts::take_from_address<gatekeeper::Listing>(&scenario, ADMIN);
            
            // テスト用のSUIコインを作成（1 SUI = 10^9）
            let coin = coin::mint_for_testing<SUI>(PRICE, ts::ctx(&mut scenario));
            
            // NFTの数を取得（購入前）
            let nft_count_before = gatekeeper::get_nft_count(&listing);
            
            // NFTを購入
            gatekeeper::mint_nft<SUI>(
                &mut listing,
                0, // 最初のNFTのインデックス
                coin,
                ts::ctx(&mut scenario)
            );
            
            // NFTリストからNFTが削除されていることを確認
            assert_eq(gatekeeper::get_nft_count(&listing), nft_count_before - 1);
            
            // Listingを返却
            ts::return_to_address(ADMIN, listing);
        };
        
        // 次のトランザクションは購入者として実行して、NFTが受け取れているか確認
        ts::next_tx(&mut scenario, BUYER);
        {
            // 購入者がNFTを受け取っていることを確認
            let nft = ts::take_from_sender<gatekeeper::NFT>(&scenario);
            
            // NFTの内容を確認（ゲッター関数を使用）
            assert_eq(gatekeeper::get_nft_owner(&nft), BUYER);
            assert_eq(gatekeeper::get_nft_price(&nft), PRICE);
            assert_eq(gatekeeper::get_nft_name(&nft), NFT_NAME);
            assert_eq(gatekeeper::get_nft_blob_id(&nft), BLOB_ID);
            assert_eq(gatekeeper::get_nft_description(&nft), NFT_DESCRIPTION);
            
            // NFTを返却
            ts::return_to_sender(&scenario, nft);
        };
        
        // テストシナリオの終了
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = gatekeeper::EInvalidPrice)]
    fun test_mint_nft_with_insufficient_payment() {
        // テストシナリオの開始 - mutキーワードを追加
        let mut scenario = ts::begin(ADMIN);
        
        // 1. Listingの初期化と準備
        {
            gatekeeper::init_listing(ts::ctx(&mut scenario));
        };
        
        // 次のトランザクションへ
        ts::next_tx(&mut scenario, ADMIN);
        
        // 2. NFTのリスト（出品）
        {
            let mut listing = ts::take_from_sender<gatekeeper::Listing>(&scenario);
            
            gatekeeper::list_nft(
                &mut listing,
                PRICE,
                BLOB_ID,
                NFT_NAME,
                NFT_DESCRIPTION,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, listing);
        };
        
        // 次のトランザクションは購入者として実行
        ts::next_tx(&mut scenario, BUYER);
        
        // 3. 不十分な支払いでNFTの購入を試みる
        {
            let mut listing = ts::take_from_address<gatekeeper::Listing>(&scenario, ADMIN);
            
            // 不十分な金額のコインを作成
            let insufficient_coin = coin::mint_for_testing<SUI>(PRICE - 1, ts::ctx(&mut scenario));
            
            // 支払いが不足しているため失敗するはず
            gatekeeper::mint_nft<SUI>(
                &mut listing,
                0,
                insufficient_coin,
                ts::ctx(&mut scenario)
            );
            
            // このコードには到達しないはず
            ts::return_to_address(ADMIN, listing);
        };
        
        // テストシナリオの終了
        ts::end(scenario);
    }
}
