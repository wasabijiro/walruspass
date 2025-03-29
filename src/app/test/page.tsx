// 'use client'

// import { listFiles, listAllFiles, downloadFile } from "@/lib/tusky/tusky";
// import { logger } from "@/lib/logger";
// import { useTusky } from "@/hooks/useTusky";
// import { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2 } from "lucide-react";

// // listFiles関数の戻り値の型を定義
// interface ListFilesResult {
//   items: Record<string, unknown>[];
//   nextToken: string | null;
// }

// export default function TestPage() {
//   const { client, isSignedIn } = useTusky();
//   const [result, setResult] = useState<ListFilesResult | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

//   // clientの状態をチェック
//   useEffect(() => {
//     if (!client) {
//       setError("Tuskyクライアントが初期化されていません。ログインしてください。");
//     } else {
//       setError(null);
//     }
//   }, [client]);

//   // ファイル一覧の取得
//   const handleFetchFiles = async () => {
//     if (!client) {
//       setError("Tuskyクライアントが初期化されていません。ログインしてください。");
//       return;
//     }

//     try {
//       setIsLoading(true);
//       setError(null);
      
//       logger.info("vaultIdでフィルタしたlistFilesを実行します", { 
//         vaultId: 'a9205755-c451-4a7d-ac80-b18773858371',
//         clientInitialized: !!client
//       });
      
//       const filteredResult = await listFiles(client, { 
//         vaultId: 'a9205755-c451-4a7d-ac80-b18773858371' 
//       });
      
//       logger.info("vaultIdでフィルタしたlistFilesの結果", { filteredResult });
//       setResult(filteredResult);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : "不明なエラーが発生しました";
//       logger.error("エラーが発生しました", { error: err });
//       setError(errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // 全ファイル一覧の取得
//   const handleFetchAllFiles = async () => {
//     if (!client) {
//       setError("Tuskyクライアントが初期化されていません。ログインしてください。");
//       return;
//     }

//     try {
//       setIsLoading(true);
//       setError(null);
      
//       logger.info("全ファイル一覧を取得します");
      
//       const allFiles = await listAllFiles(client);
      
//       logger.info("全ファイル一覧の取得結果", { allFiles });
//       setResult(allFiles);
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : "不明なエラーが発生しました";
//       logger.error("全ファイル一覧の取得中にエラーが発生しました", { error: err });
//       setError(errorMessage);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ファイルをダウンロードする関数を修正
//   const handleDownloadFile = async (fileId: string) => {
//     if (!client) {
//       setError("Tuskyクライアントが初期化されていません。ログインしてください。");
//       return;
//     }

//     try {
//       setDownloadingFileId(fileId);
//       setError(null); // 前回のエラーをクリア
      
//       logger.info("ファイルのダウンロードを開始します", { fileId });
      
//       // まずファイルが本当に存在するか確認
//       try {
//         logger.info("ファイル情報の確認を試みます", { fileId });
//         const fileInfo = await client.file.get(fileId);
//         logger.info("ファイル情報の取得に成功しました", { fileInfo });
        
//         // ファイルの暗号化状態をチェック
//         if (fileInfo.encrypted) {
//           logger.info("暗号化されたファイルです。暗号化設定を試みます");
          
//           try {
//             // まず既存の暗号化設定をクリア
//             await client.clearEncrypter();
//             logger.info("暗号化設定をクリアしました");
            
//             // 暗号化設定を追加
//             await client.addEncrypter({ 
//               password: "wasabiga1bandesu" // テスト用パスワード
//             });
//             logger.info("新しい暗号化設定を適用しました");
//           } catch (encryptError) {
//             logger.warn("暗号化設定中にエラーが発生しました", { encryptError });
//           }
//         } else {
//           logger.info("このファイルは暗号化されていません");
//         }
//       } catch (fileInfoError) {
//         logger.warn("ファイル情報の取得に失敗しましたが、ダウンロードを試みます", { 
//           error: fileInfoError,
//           fileId 
//         });
//       }
      
//       // ダウンロード処理（リトライロジックを追加）
//       let fileData;
//       let retryCount = 0;
//       const maxRetries = 2;
      
//       while (retryCount <= maxRetries) {
//         try {
//           logger.info(`ダウンロード試行 ${retryCount + 1}/${maxRetries + 1}`, { fileId });
//           fileData = await downloadFile(client, fileId);
//           logger.info("ファイルデータの取得に成功しました");
//           break; // 成功したらループを抜ける
//         } catch (downloadError) {
//           retryCount++;
          
//           if (retryCount <= maxRetries) {
//             logger.warn(`ダウンロード失敗（${retryCount}/${maxRetries}）。リトライします`, { 
//               error: downloadError,
//               fileId 
//             });
            
//             // 少し待ってからリトライ
//             await new Promise(resolve => setTimeout(resolve, 1000));
//           } else {
//             // 最大リトライ回数に達したらエラーを投げる
//             logger.error("最大リトライ回数に達しました", { fileId });
//             throw downloadError;
//           }
//         }
//       }
      
//       if (!fileData) {
//         throw new Error("ファイルデータを取得できませんでした");
//       }
      
//       // ダウンロードしたデータからBlobを作成
//       const blob = new Blob([fileData]);
      
//       // ダウンロードリンクを作成して自動クリック
//       const url = URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = `file-${fileId}`;
//       document.body.appendChild(a);
//       a.click();
      
//       // 使用後にリソースを解放
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a);
      
//       logger.info("ファイルのダウンロードが完了しました", { fileId });
//     } catch (err) {
//       const errorMessage = err instanceof Error ? err.message : "ダウンロード中に不明なエラーが発生しました";
//       logger.error("ファイルのダウンロード中にエラーが発生しました", { error: err, fileId });
      
//       // より詳細なエラーメッセージを表示
//       setError(`ダウンロードエラー: ${errorMessage}。このIDのファイルが存在しないか、アクセス権がない可能性があります。また、Tuskyサーバーの一時的な問題の可能性もあります。`);
//     } finally {
//       setDownloadingFileId(null);
//     }
//   };

//   return (
//     <div className="p-6 max-w-4xl mx-auto">
//       <h1 className="text-2xl font-bold mb-6">Tuskyファイルテスト</h1>
      
//       <div className="mb-6 bg-gray-100 p-4 rounded">
//         <h2 className="text-lg font-semibold mb-2">クライアントステータス</h2>
//         <div className="flex items-center gap-2 mb-2">
//           <span className={`w-3 h-3 rounded-full ${client ? 'bg-green-500' : 'bg-red-500'}`}></span>
//           <span>クライアント: {client ? '初期化済み' : '未初期化'}</span>
//         </div>
//         <div className="flex items-center gap-2">
//           <span className={`w-3 h-3 rounded-full ${isSignedIn ? 'bg-green-500' : 'bg-red-500'}`}></span>
//           <span>サインイン状態: {isSignedIn ? 'サインイン済み' : '未サインイン'}</span>
//         </div>
//       </div>
      
//       {/* ハードコードされたIDでダウンロードするボタン - サインイン状態のときのみ表示 */}
//       {isSignedIn && (
//         <div className="mb-6 bg-blue-50 p-4 rounded border border-blue-200">
          
//           <h2 className="text-lg font-semibold mb-2">特定IDのファイルをダウンロード</h2>
//           <p className="text-sm text-gray-600 mb-3">
//             ID: 3f056da3-063e-4013-b980-ba86ed5279b7
//           </p>
//           <Button
//             onClick={() => handleDownloadFile("3f056da3-063e-4013-b980-ba86ed5279b7")}
//             disabled={downloadingFileId === "3f056da3-063e-4013-b980-ba86ed5279b7" || isLoading}
//             className="w-full sm:w-auto"
//           >
//             {downloadingFileId === "3f056da3-063e-4013-b980-ba86ed5279b7" ? (
//               <>
//                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                 ダウンロード中
//               </>
//             ) : "特定IDのファイルをダウンロード"}
//           </Button>
//         </div>
//       )}
      
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
//           <p>{error}</p>
//         </div>
//       )}
      
//       <div className="mb-6 flex flex-col md:flex-row gap-4">
//         <Button 
//           onClick={handleFetchFiles} 
//           disabled={isLoading || !client}
//         >
//           {isLoading ? "読み込み中..." : "Vault指定でファイルを検索"}
//         </Button>
        
//         <Button 
//           onClick={handleFetchAllFiles} 
//           disabled={isLoading || !client}
//           variant="outline"
//         >
//           {isLoading ? "読み込み中..." : "全ファイル一覧を取得"}
//         </Button>
        
//         {!client && (
//           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-4 md:mt-0">
//             <p>未ログイン状態です。ログインしてからお試しください。</p>
//           </div>
//         )}
//       </div>
      
//       {result && (
//         <div className="mt-6">
//           <h2 className="text-lg font-semibold mb-2">検索結果</h2>
          
//           {/* ファイル一覧の表示とダウンロードボタン */}
//           {result.items && result.items.length > 0 ? (
//             <div className="space-y-4">
//               {result.items.map((item, index) => (
//                 <div key={index} className="bg-gray-100 p-4 rounded border border-gray-200">
//                   <div className="flex justify-between items-start">
//                     <div>
//                       <h3 className="font-medium">
//                         {item.name || item.id || `File ${index + 1}`}
//                       </h3>
//                       <p className="text-sm text-gray-600">
//                         ID: {item.id || 'N/A'} 
//                       </p>
//                       {item.uploadId && (
//                         <p className="text-sm text-gray-600">
//                           Upload ID: {item.uploadId}
//                         </p>
//                       )}
//                     </div>
//                     {/* 常にダウンロードボタンを表示 */}
//                     <Button
//                       size="sm"
//                       onClick={() => handleDownloadFile(item.id as string)}
//                       disabled={downloadingFileId === item.id || isLoading}
//                     >
//                       {downloadingFileId === item.id ? (
//                         <>
//                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                           ダウンロード中
//                         </>
//                       ) : "ダウンロード"}
//                     </Button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <p>ファイルがありません</p>
//           )}
          
//           <h3 className="text-md font-semibold mt-4 mb-2">生データ</h3>
//           <pre className="bg-gray-100 p-4 rounded overflow-auto">
//             {JSON.stringify(result, null, 2)}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// }