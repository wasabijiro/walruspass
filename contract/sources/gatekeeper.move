/*
/// Module: contract
module contract::contract;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module contract::gatekeeper {
    use sui::object::UID;
    use sui::tx_context::TxContext;
    use sui::coin::{Self, Coin};
    use sui::transfer;
    use std::string::String;
    use sui::event;
    use sui::object;
    use sui::tx_context;

    // エラーコード
    const EInvalidPrice: u64 = 1;

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
        blob_id: String,
        name: String,
        description: String,
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
        name: String,
    }

    /// NFTを作成して出品する
    public entry fun create_nft(
        price: u64,
        blob_id: String,
        name: String,
        description: String,
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
        transfer::public_transfer(nft, owner);
    }

    /// NFTを購入する
    public entry fun buy_nft<T>(
        mut nft: NFT,
        payment: Coin<T>,
        ctx: &mut TxContext
    ) {
        let coin_value = coin::value(&payment);
        assert!(coin_value >= nft.price, EInvalidPrice);

        let buyer = tx_context::sender(ctx);
        let seller = nft.owner;

        // 支払いの転送
        transfer::public_transfer(payment, seller);
        
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

    /// NFTのオーナーを取得する
    public fun get_nft_owner(nft: &NFT): address {
        nft.owner
    }

    /// NFTの価格を取得する
    public fun get_nft_price(nft: &NFT): u64 {
        nft.price
    }

    /// NFTの名前を取得する
    public fun get_nft_name(nft: &NFT): String {
        nft.name
    }

    /// NFTのblobIDを取得する
    public fun get_nft_blob_id(nft: &NFT): String {
        nft.blob_id
    }

    /// NFTの説明を取得する
    public fun get_nft_description(nft: &NFT): String {
        nft.description
    }
}
