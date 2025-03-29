/*
/// Module: contract
module contract::contract;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module contract::gatekeeper {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::transfer;
    use std::vector;
    use sui::event;

    // エラーコード
    const EInvalidPrice: u64 = 1;
    const EInvalidIndex: u64 = 2;

    /// NFT リソース
    /// - `id`: 一意の識別子
    /// - `owner`: 現在の所有者アドレス
    /// - `price`: 出品価格（SUI 単位）
    /// - `blob_id`: NFT のメタデータとしての blob_id
    /// - `name`: NFT の名前（メタデータ）
    /// - `description`: NFT の説明（メタデータ）
    public struct NFT has key, store {
        id: UID,
        owner: address,
        price: u64,
        blob_id: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
    }

    /// 複数の NFT を管理するコンテナリソース
    public struct Listing has key {
        id: UID,
        nfts: vector<NFT>,
    }

    /// NFT Mint イベント - NFTがmintされたときに発行されるイベント
    public struct NFTMintEvent has copy, drop {
        // NFTのIDを保存（stringに変換して保存）
        nft_id: address,
        // 購入者のアドレス
        buyer: address,
        // 販売者のアドレス
        seller: address,
        // 支払い金額
        price: u64,
        // NFTの名前
        name: vector<u8>,
    }

    /// Listing の初期化
    public entry fun init_listing(ctx: &mut TxContext) {
        let listing = Listing { 
            id: object::new(ctx),
            nfts: vector::empty<NFT>() 
        };
        transfer::transfer(listing, tx_context::sender(ctx));
    }

    /// NFT を出品するエントリーポイント
    /// - `price`: 出品価格
    /// - `blob_id`: NFT のメタデータとしての blob_id
    /// - `name`: NFT の名前
    /// - `description`: NFT の説明
    /// - `ctx`: トランザクションコンテキスト
    public entry fun list_nft(
        listing: &mut Listing,
        price: u64,
        blob_id: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let nft = NFT {
            id: object::new(ctx),
            owner,
            price,
            blob_id,
            name,
            description,
        };
        vector::push_back(&mut listing.nfts, nft);
    }

    /// NFT を mint（購入）するエントリーポイント
    /// - `listing`: NFTのリスト
    /// - `nft_index`: 対象NFTのインデックス
    /// - `payment`: 購入者が支払うSUIコイン
    /// - `ctx`: トランザクションコンテキスト
    public entry fun mint_nft<T>(
        listing: &mut Listing,
        nft_index: u64,
        payment: Coin<T>,
        ctx: &mut TxContext
    ) {
        assert!(nft_index < vector::length(&listing.nfts), EInvalidIndex);
        
        // 支払い額の確認
        let nft_ref = vector::borrow(&listing.nfts, nft_index);
        let coin_value = coin::value(&payment);
        assert!(coin_value >= nft_ref.price, EInvalidPrice);

        // 購入者と販売者
        let buyer = tx_context::sender(ctx);
        let seller = nft_ref.owner;

        // 支払いの転送
        transfer::public_transfer(payment, seller);
        
        // NFTをリストから取り出す - ここで変数を mut として宣言する
        let mut nft = vector::remove(&mut listing.nfts, nft_index);
        
        // イベント発行用のデータを保存
        let nft_id = object::uid_to_address(&nft.id);
        let price = nft.price;
        let name = nft.name;
        
        // NFTの所有者を購入者に更新
        nft.owner = buyer;
        
        // NFTを購入者に転送
        transfer::public_transfer(nft, buyer);
        
        // イベントの発行
        event::emit(NFTMintEvent {
            nft_id,
            buyer,
            seller,
            price,
            name,
        });
    }

    /// 特定のNFTを検索する公開関数
    public fun get_nft_by_index(listing: &Listing, index: u64): &NFT {
        assert!(index < vector::length(&listing.nfts), EInvalidIndex);
        vector::borrow(&listing.nfts, index)
    }

    /// NFTの数を取得する関数
    public fun get_nft_count(listing: &Listing): u64 {
        vector::length(&listing.nfts)
    }

    /// NFTのオーナーを取得する
    public fun get_nft_owner(nft: &NFT): address {
        nft.owner
    }

    /// NFTの価格を取得する
    public fun get_nft_price(nft: &NFT): u64 {
        nft.price
    }

    /// NFTの名前を取得する
    public fun get_nft_name(nft: &NFT): vector<u8> {
        nft.name
    }

    /// NFTのblobIDを取得する
    public fun get_nft_blob_id(nft: &NFT): vector<u8> {
        nft.blob_id
    }

    /// NFTの説明を取得する
    public fun get_nft_description(nft: &NFT): vector<u8> {
        nft.description
    }
}
