"use client";

/* eslint-disable @next/next/no-img-element -- Local upload preview is not compatible with framework image optimization. */
import { useEffect, useMemo, useRef, useState } from "react";
import { createMenuImageCropPlan, getAiMenuImageQualityWarnings } from "../../platform/ai-menu";
import type { AiMenuProduct, ImageBox } from "../../platform/ai-menu";
import type { MenuProduct } from "../../platform/types";

type Phase = "idle" | "ready" | "compressing" | "analyzing" | "review" | "error";
type AiMenuResponse = { products?: AiMenuProduct[]; warnings?: string[]; error?: string };
type CompressedMenuImage = { imageBase64: string; mimeType: "image/jpeg"; width: number; height: number; originalWidth: number; originalHeight: number };

const UploadIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>;
const SparkIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="M18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>;

async function compressMenuImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;
    const maxEdge = 1800;
    const scale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
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
    return { imageBase64: dataUrl.split(",")[1], mimeType: "image/jpeg", width, height, originalWidth, originalHeight } satisfies CompressedMenuImage;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

async function imageBlobFromBox(file: File, box: ImageBox) {
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const crop = createMenuImageCropPlan(image.naturalWidth, image.naturalHeight, box);
    const canvas = document.createElement("canvas");
    canvas.width = crop.outputWidth;
    canvas.height = crop.outputHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, crop.sourceX, crop.sourceY, crop.sourceWidth, crop.sourceHeight, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(src);
  }
}

async function inspectMenuImage(file: File, previewUrl: string) {
  const image = await loadImage(previewUrl);
  return getAiMenuImageQualityWarnings({ fileName: file.name, fileSize: file.size, mimeType: file.type, width: image.naturalWidth, height: image.naturalHeight });
}

async function resizeDishPhoto(file: File) {
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const maxWidth = 1200;
    const maxHeight = 900;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("無法處理餐點照片");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) throw new Error("無法處理餐點照片");
    return blob;
  } finally { URL.revokeObjectURL(src); }
}

function itemReviewNotes(product: AiMenuProduct) {
  const notes = [];
  if (product.price <= 0) notes.push("價格待補");
  if (!product.image) notes.push("照片待補");
  if (!product.name.trim()) notes.push("品名待補");
  if (!product.category.trim()) notes.push("分類待確認");
  return notes.length ? notes : ["待校對"];
}

async function blobBase64(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("無法讀取餐點照片"));
    reader.readAsDataURL(blob);
  });
  return dataUrl.split(",")[1];
}

async function uploadDishPhoto(storeId: string, blob: Blob) {
  const response = await fetch("/api/menu-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId, mimeType: "image/jpeg", imageBase64: await blobBase64(blob) }) });
  const result = await response.json() as { imageUrl?: string; error?: string };
  if (!response.ok || !result.imageUrl) throw new Error(result.error || "餐點圖片上傳失敗");
  return result.imageUrl;
}

export default function AiMenuImporter({ storeId, onImport }: { storeId: string; onImport: (products: MenuProduct[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [products, setProducts] = useState<AiMenuProduct[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const previewUrlRef = useRef("");
  const cropBlobsRef = useRef(new Map<string, Blob>());
  const cropUrlsRef = useRef(new Set<string>());

  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); cropUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const selectedProducts = useMemo(() => products.filter((product) => selected[product.id] && product.name.trim() && product.price > 0), [products, selected]);
  const extractedImageCount = products.filter((product) => product.image).length;
  const clearCrops = () => { cropUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); cropUrlsRef.current.clear(); cropBlobsRef.current.clear(); };
  const chooseFile = async (next: File | null) => {
    setError(""); setWarnings([]); setProducts([]); setSelected({}); clearCrops();
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreviewUrl(""); setFile(null);
    if (!next) { setFile(null); setPhase("idle"); return; }
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(next.type)) { setError("請上傳 JPG、PNG 或 WebP 菜單照片。"); setPhase("error"); return; }
    if (next.size > 10 * 1024 * 1024) { setError("照片超過 10MB，請先縮小後再上傳。"); setPhase("error"); return; }
    const nextPreview = URL.createObjectURL(next);
    previewUrlRef.current = nextPreview;
    setPreviewUrl(nextPreview); setFile(next); setPhase("ready");
    try {
      setWarnings(await inspectMenuImage(next, nextPreview));
    } catch {
      setWarnings(["無法預先讀取照片尺寸；AI 辨識後請逐項校對價格與照片。"]);
    }
  };

  const analyze = async () => {
    if (!file) return;
    setError(""); setPhase("compressing");
    try {
      const image = await compressMenuImage(file);
      setPhase("analyzing");
      const sourceWarnings = getAiMenuImageQualityWarnings({ fileName: file.name, fileSize: file.size, mimeType: file.type, width: image.originalWidth, height: image.originalHeight });
      const response = await fetch("/api/ai-menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageBase64: image.imageBase64, mimeType: image.mimeType, width: image.width, height: image.height, originalWidth: image.originalWidth, originalHeight: image.originalHeight, storeId }) });
      const result = await response.json() as AiMenuResponse;
      if (!response.ok || !result.products) throw new Error(result.error || "AI 暫時無法辨識這張菜單。");
      const productsWithImages = await Promise.all(result.products.map(async (product) => {
        if (!product.sourceImageBox) return product;
        const blob = await imageBlobFromBox(file, product.sourceImageBox);
        if (!blob) return product;
        const url = URL.createObjectURL(blob);
        cropBlobsRef.current.set(product.id, blob); cropUrlsRef.current.add(url);
        return { ...product, image: url, imageAlt: `${product.name}，由原菜單照片擷取` };
      }));
      setProducts(productsWithImages);
      setSelected(Object.fromEntries(result.products.map((product) => [product.id, product.price > 0])));
      setWarnings(Array.from(new Set([...sourceWarnings, ...(result.warnings || [])])));
      setPhase("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "辨識失敗，請重新拍照後再試。");
      setPhase("error");
    }
  };

  const updateProduct = (id: string, changes: Partial<AiMenuProduct>) => setProducts((current) => current.map((product) => product.id === id ? { ...product, ...changes } : product));
  const replaceProductImage = async (id: string, next: File | null) => {
    if (!next) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(next.type) || next.size > 8 * 1024 * 1024) { setError("餐點照片請使用 JPG、PNG 或 WebP，且不得超過 8MB。"); return; }
    try {
      const blob = await resizeDishPhoto(next);
      const previous = products.find((product) => product.id === id)?.image;
      if (previous?.startsWith("blob:")) { URL.revokeObjectURL(previous); cropUrlsRef.current.delete(previous); }
      const url = URL.createObjectURL(blob);
      cropUrlsRef.current.add(url); cropBlobsRef.current.set(id, blob);
      updateProduct(id, { image: url, imageAlt: `${products.find((product) => product.id === id)?.name || "餐點"}照片` });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "無法處理餐點照片"); }
  };
  const removeProductImage = (id: string) => {
    const previous = products.find((product) => product.id === id)?.image;
    if (previous?.startsWith("blob:")) { URL.revokeObjectURL(previous); cropUrlsRef.current.delete(previous); }
    cropBlobsRef.current.delete(id); updateProduct(id, { image: "", sourceImageBox: undefined });
  };
  const apply = async () => {
    if (!selectedProducts.length) return;
    setImporting(true); setError("");
    try {
      const uploaded = await Promise.all(selectedProducts.map(async (product) => {
        const blob = cropBlobsRef.current.get(product.id);
        const image = blob ? await uploadDishPhoto(storeId, blob) : "";
        const { sourceImageBox: _sourceImageBox, ...menuProduct } = product;
        void _sourceImageBox;
        return { ...menuProduct, image } satisfies MenuProduct;
      }));
      onImport(uploaded);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = ""; clearCrops();
      setPreviewUrl(""); setFile(null); setProducts([]); setSelected({}); setWarnings([]); setPhase("idle");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "餐點圖片上傳失敗，請重新嘗試。"); }
    finally { setImporting(false); }
  };

  return <section className="ai-menu-importer" aria-labelledby="ai-menu-title">
    <header><div className="ai-menu-icon"><SparkIcon/></div><div><p>AI 快速上菜單</p><h2 id="ai-menu-title">拍一張菜單，幾分鐘完成點餐頁</h2><span>AI 只建立草稿；價格、品項與選項仍由店家確認後發布。</span></div><b>Beta</b></header>
    <ol className="ai-import-steps" aria-label="AI 上菜單流程"><li className={["ready", "compressing", "analyzing", "review"].includes(phase) ? "active" : ""}><b>1</b><span>上傳照片</span></li><li className={["compressing", "analyzing", "review"].includes(phase) ? "active" : ""}><b>2</b><span>辨識圖文</span></li><li className={phase === "review" ? "active" : ""}><b>3</b><span>校對匯入</span></li></ol>

    {phase !== "review" && <div className="ai-upload-layout"><label className={`ai-upload-dropzone ${previewUrl ? "has-image" : ""}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void chooseFile(event.target.files?.[0] || null)}/>{previewUrl ? <img src={previewUrl} alt="即將交給 AI 辨識的菜單照片預覽"/> : <><UploadIcon/><b>選擇或拍攝菜單照片</b><span>支援 JPG、PNG、WebP，最大 10MB</span></>}<em>{previewUrl ? "更換照片" : "上傳照片"}</em></label><div className="ai-upload-guide"><h3>匯入 SOP</h3><ul><li>先用原始高解析照片，不用社群或外送後台截圖</li><li>辨識完成後，每個品項都先視為待校對草稿</li><li>逐項確認品名、價格、分類與照片，再匯入菜單草稿</li></ul><p>照片會傳送給 Google Gemini 進行辨識；Rootable 不保存原始照片。</p></div></div>}

    {file && phase !== "review" && <div className="ai-analyze-actions"><div><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span></div><button onClick={analyze} disabled={phase === "compressing" || phase === "analyzing"}><SparkIcon/>{phase === "compressing" ? "正在整理照片…" : phase === "analyzing" ? "AI 正在讀取品名與價格…" : "開始 AI 辨識"}</button></div>}
    {phase !== "review" && warnings.length > 0 && <div className="ai-warning" role="status"><b>照片來源提醒</b>{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}
    {phase === "analyzing" && <div className="ai-progress" role="status"><span/><p>通常需要 10–30 秒，請不要關閉頁面。</p></div>}
    {error && <div className="ai-import-error" role="alert"><b>目前無法完成辨識</b><span>{error}</span><button onClick={() => { setPhase(file ? "ready" : "idle"); setError(""); }}>重新嘗試</button></div>}

    {phase === "review" && <div className="ai-review"><header><div><p>AI 已辨識 {products.length} 個品項・擷取 {extractedImageCount} 張照片・目前待校對</p><h3>照 SOP 確認後再匯入</h3></div><button onClick={() => { clearCrops(); setPhase("ready"); setProducts([]); }}>重新上傳</button></header>{warnings.length > 0 && <div className="ai-warning"><b>需要店家注意</b>{warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>}<div className="ai-review-list">{products.map((product) => <article className={!selected[product.id] ? "excluded" : ""} key={product.id}><label className="ai-item-check"><input type="checkbox" checked={Boolean(selected[product.id])} onChange={(event) => setSelected({ ...selected, [product.id]: event.target.checked })}/><span>匯入</span></label><div className={`ai-item-photo ${product.image ? "has-photo" : "missing-photo"}`}>{product.image ? <img src={product.image} alt={product.imageAlt}/> : <div><SparkIcon/><span>照片待補</span></div>}<div><label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void replaceProductImage(product.id, event.target.files?.[0] || null)}/>{product.image ? "更換" : "補照片"}</label>{product.image && <button type="button" onClick={() => removeProductImage(product.id)}>移除</button>}</div></div><div className="ai-item-fields"><label>品項名稱<input value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })}/></label><label>分類<input value={product.category} onChange={(event) => updateProduct(product.id, { category: event.target.value })}/></label><label>價格<input className={product.price <= 0 ? "needs-review" : ""} type="number" min="0" value={product.price || ""} placeholder="待確認" onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })}/></label><label className="wide">說明<input value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })}/></label></div><div className="ai-item-meta"><span>{product.image ? "原圖裁切照片，請檢查是否裁到餐點" : "照片待補"}・{product.optionGroups.length ? `${product.optionGroups.length} 組選項` : "沒有辨識到選項"}</span><b>{itemReviewNotes(product).join("／")}</b></div></article>)}</div><footer><div><b>將匯入 {selectedProducts.length} 個已勾選且有價格的品項</b><span>SOP：對原菜單核對品名、價格、分類、選項與照片；匯入後仍是店家草稿，不會直接對顧客公開。</span></div><button onClick={() => void apply()} disabled={!selectedProducts.length || importing}>{importing ? "正在儲存餐點圖片…" : "確認校對並匯入草稿"}</button></footer></div>}
  </section>;
}
