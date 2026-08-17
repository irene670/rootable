"use client";

/* eslint-disable @next/next/no-img-element -- Local upload preview is not compatible with framework image optimization. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuProduct } from "../../platform/types";

type Phase = "idle" | "ready" | "compressing" | "analyzing" | "review" | "error";
type AiMenuResponse = { products?: MenuProduct[]; warnings?: string[]; error?: string };

const UploadIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>;
const SparkIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;

async function compressMenuImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("這個瀏覽器無法處理圖片，請改用較新的瀏覽器。");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob) throw new Error("圖片壓縮失敗，請換一張照片再試。");
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("無法讀取照片"));
      reader.readAsDataURL(blob);
    });
    return { imageBase64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AiMenuImporter({ storeId, onImport }: { storeId: string; onImport: (products: MenuProduct[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  const selectedProducts = useMemo(() => products.filter((product) => selected[product.id] && product.name.trim() && product.price > 0), [products, selected]);
  const chooseFile = (next: File | null) => {
    setError(""); setWarnings([]); setProducts([]); setSelected({});
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreviewUrl(""); setFile(null);
    if (!next) { setFile(null); setPhase("idle"); return; }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(next.type)) { setError("請上傳 JPG、PNG 或 WebP 菜單照片。"); setPhase("error"); return; }
    if (next.size > 10 * 1024 * 1024) { setError("照片超過 10MB，請先縮小後再上傳。"); setPhase("error"); return; }
    const nextPreview = URL.createObjectURL(next);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview); setFile(next); setPhase("ready");
  };

  const analyze = async () => {
    if (!file) return;
    setError(""); setPhase("compressing");
    try {
      const image = await compressMenuImage(file);
      setPhase("analyzing");
      const response = await fetch("/api/ai-menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...image, storeId }) });
      const result = await response.json() as AiMenuResponse;
      if (!response.ok || !result.products) throw new Error(result.error || "AI 暫時無法辨識這張菜單。");
      setProducts(result.products);
      setSelected(Object.fromEntries(result.products.map((product) => [product.id, product.price > 0])));
      setWarnings(result.warnings || []);
      setPhase("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "辨識失敗，請重新拍照後再試。");
      setPhase("error");
    }
  };

  const updateProduct = (id: string, changes: Partial<MenuProduct>) => setProducts((current) => current.map((product) => product.id === id ? { ...product, ...changes } : product));
  const apply = () => {
    if (!selectedProducts.length) return;
    onImport(selectedProducts);
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreviewUrl(""); setFile(null); setProducts([]); setSelected({}); setWarnings([]); setPhase("idle");
  };

  return <section className="ai-menu-importer" aria-labelledby="ai-menu-title">
    <header><div className="ai-menu-icon"><SparkIcon/></div><div><p>AI 快速上菜單</p><h2 id="ai-menu-title">拍一張菜單，幾分鐘完成點餐頁</h2><span>AI 只建立草稿；價格、品項與選項仍由店家確認後發布。</span></div><b>Beta</b></header>
    <ol className="ai-import-steps" aria-label="AI 上菜單流程"><li className={["ready", "compressing", "analyzing", "review"].includes(phase) ? "active" : ""}><b>1</b><span>上傳照片</span></li><li className={["compressing", "analyzing", "review"].includes(phase) ? "active" : ""}><b>2</b><span>AI 辨識</span></li><li className={phase === "review" ? "active" : ""}><b>3</b><span>校對匯入</span></li></ol>

    {phase !== "review" && <div className="ai-upload-layout"><label className={`ai-upload-dropzone ${previewUrl ? "has-image" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0] || null)}/>{previewUrl ? <img src={previewUrl} alt="即將交給 AI 辨識的菜單照片預覽"/> : <><UploadIcon/><b>選擇或拍攝菜單照片</b><span>支援 JPG、PNG、WebP，最大 10MB</span></>}<em>{previewUrl ? "更換照片" : "上傳照片"}</em></label><div className="ai-upload-guide"><h3>拍攝小技巧</h3><ul><li>整張菜單平放，光線均勻、不反光</li><li>品名與價格要清楚，模糊處 AI 會標記待確認</li><li>多頁菜單可分次上傳，再合併到同一份草稿</li></ul><p>照片會傳送給 Google Gemini 進行辨識；Rootable 不保存原始照片。</p></div></div>}

    {file && phase !== "review" && <div className="ai-analyze-actions"><div><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></div><button onClick={analyze} disabled={phase === "compressing" || phase === "analyzing"}><SparkIcon/>{phase === "compressing" ? "正在整理照片…" : phase === "analyzing" ? "AI 正在讀取品名與價格…" : "開始 AI 辨識"}</button></div>}
    {phase === "analyzing" && <div className="ai-progress" role="status"><span/><p>通常需要 10–30 秒，請不要關閉頁面。</p></div>}
    {error && <div className="ai-import-error" role="alert"><b>目前無法完成辨識</b><span>{error}</span><button onClick={() => { setPhase(file ? "ready" : "idle"); setError(""); }}>重新嘗試</button></div>}

    {phase === "review" && <div className="ai-review"><header><div><p>AI 已辨識 {products.length} 個品項</p><h3>請確認價格與分類</h3></div><button onClick={() => { setPhase("ready"); setProducts([]); }}>重新上傳</button></header>{warnings.length > 0 && <div className="ai-warning"><b>需要店家注意</b>{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}<div className="ai-review-list">{products.map((product) => <article className={!selected[product.id] ? "excluded" : ""} key={product.id}><label className="ai-item-check"><input type="checkbox" checked={Boolean(selected[product.id])} onChange={(event) => setSelected({ ...selected, [product.id]: event.target.checked })}/><span>匯入</span></label><div className="ai-item-fields"><label>品項名稱<input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })}/></label><label>分類<input value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value })}/></label><label>價格<input className={product.price <= 0 ? "needs-review" : ""} type="number" min="0" value={product.price || ""} placeholder="待確認" onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })}/></label><label className="wide">說明<input value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })}/></label></div><div className="ai-item-meta"><span>{product.optionGroups.length ? `${product.optionGroups.length} 組選項` : "沒有辨識到選項"}</span>{product.price <= 0 && <b>請補價格</b>}</div></article>)}</div><footer><div><b>將匯入 {selectedProducts.length} 個品項</b><span>匯入後仍是草稿，不會直接對顧客公開。</span></div><button onClick={apply} disabled={!selectedProducts.length}>匯入菜單草稿</button></footer></div>}
  </section>;
}
