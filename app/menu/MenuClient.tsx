"use client";

/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element -- Vinext uses native anchors and locally hosted responsive menu photos. */
import { useEffect, useMemo, useState } from "react";

type Product = { id:string; name:string; description:string; price:number; category:string; image:string; imageAlt:string; badge?:string; featured?:boolean };
const products:Product[] = [
  { id:"set-chicken", name:"炙燒照燒雞腿定食", description:"去骨雞腿、越光米、味噌湯與三樣小缽", price:320, category:"定食", image:"/menu/chicken.jpg", imageAlt:"炙燒雞腿搭配米飯與季節蔬菜", badge:"人氣 No.1", featured:true },
  { id:"set-salmon", name:"鹽麴烤鮭魚定食", description:"鮭魚、越光米、味噌湯與三樣小缽", price:360, category:"定食", image:"/menu/salmon.jpg", imageAlt:"烤鮭魚、米飯與味噌湯定食", badge:"每日限量" },
  { id:"vegetable-curry", name:"十蔬熟成咖哩飯", description:"洋蔥與蘋果慢炒，搭配當日烤時蔬", price:280, category:"丼與麵", image:"/menu/curry.jpg", imageAlt:"蔬菜咖哩與白飯", badge:"微辣" },
  { id:"moon-rice", name:"月見七彩野菜丼", description:"溫泉蛋、時蔬、芝麻與日式醬汁", price:290, category:"丼與麵", image:"/menu/rice-bowl.jpg", imageAlt:"鋪滿時蔬與溫泉蛋的日式丼飯" },
  { id:"tofu-bowl", name:"胡麻酥豆腐野菜碗", description:"酥豆腐、毛豆、酪梨、鮮蔬與胡麻醬", price:300, category:"丼與麵", image:"/menu/tofu.jpg", imageAlt:"酥豆腐、酪梨與多種鮮蔬組成的野菜碗" },
  { id:"miso-ramen", name:"味噌豆乳野菜拉麵", description:"豆乳味噌湯底、豆腐、海苔與季節蔬菜", price:290, category:"丼與麵", image:"/menu/ramen.jpg", imageAlt:"豆腐、海苔與蔬菜拉麵", badge:"可做全素" },
  { id:"coffee", name:"山霧手沖咖啡", description:"中淺焙，柑橘、堅果與黑糖尾韻", price:150, category:"飲品", image:"/menu/coffee.jpg", imageAlt:"木桌上的手沖黑咖啡" },
  { id:"latte", name:"黑糖海鹽拿鐵", description:"雙份濃縮、鮮奶、黑糖與海鹽奶蓋", price:160, category:"飲品", image:"/menu/coffee.jpg", imageAlt:"咖啡館木桌上的熱拿鐵", badge:"招牌" },
  { id:"matcha", name:"宇治抹茶歐蕾", description:"宇治抹茶、鮮奶，可選冰飲或熱飲", price:170, category:"飲品", image:"/menu/matcha.jpg", imageAlt:"玻璃杯中的冰抹茶歐蕾" },
  { id:"tea", name:"柚香冷泡烏龍", description:"冷泡烏龍、柚子蜜與新鮮檸檬", price:130, category:"飲品", image:"/menu/tea.jpg", imageAlt:"陽光下加滿冰塊的冷泡茶" },
  { id:"pudding", name:"焦糖昭和布丁", description:"雞蛋、鮮奶、香草與微苦焦糖", price:130, category:"甜點", image:"/menu/pudding.jpg", imageAlt:"玻璃杯中的手工奶香布丁", badge:"每日手作" },
  { id:"cheesecake", name:"柚香巴斯克乳酪", description:"奶油乳酪、柚子皮與海鹽鮮奶油", price:160, category:"甜點", image:"/menu/cheesecake.jpg", imageAlt:"白色盤中的乳酪蛋糕切片" },
];
const categories = ["熱門推薦","定食","丼與麵","飲品","甜點"];
type Cart=Record<string,number>; type ProductChoices=Record<string,string[]>;
type PaymentMethod="cash"|"rootable_pay"; type PaymentChannel="cash"|"line_pay"|"apple_pay";
type CreatedOrder={orderNo:string;tableNo:string;subtotal:number;paymentStatus:string};
type OrderStep="welcome"|"menu"|"checkout"|"success";
const money=(value:number)=>`NT$ ${value.toLocaleString("zh-TW")}`;
const getChoiceGroups=(product:Product)=>{
  if(product.category==="飲品") return [{label:"溫度",values:["冰","熱"]},{label:"甜度",values:["正常甜","半糖","無糖"]}];
  if(product.id==="miso-ramen") return [{label:"辣度",values:["不辣","小辣"]},{label:"飲食需求",values:["原味","全素"]}];
  if(["定食","丼與麵"].includes(product.category)) return [{label:"飯量",values:["正常飯","少飯"]},{label:"醬汁",values:["正常醬","醬少"]}];
  return [];
};
const SearchIcon=()=> <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>;
const CloseIcon=()=> <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>;

export default function MenuClient(){
  const [category,setCategory]=useState("熱門推薦"); const [query,setQuery]=useState("");
  const [cart,setCart]=useState<Cart>({}); const [choices,setChoices]=useState<ProductChoices>({});
  const [step,setStep]=useState<OrderStep>("welcome");
  const [tableNo,setTableNo]=useState("A03");
  const [note,setNote]=useState(""); const [paymentMethod,setPaymentMethod]=useState<PaymentMethod>("cash");
  const [paymentChannel,setPaymentChannel]=useState<PaymentChannel>("cash"); const [loading,setLoading]=useState(false);
  const [error,setError]=useState(""); const [createdOrder,setCreatedOrder]=useState<CreatedOrder|null>(null);
  const [detailProduct,setDetailProduct]=useState<Product|null>(null); const [detailQuantity,setDetailQuantity]=useState(1);
  const [detailChoices,setDetailChoices]=useState<string[]>([]);
  useEffect(()=>{const scannedTable=new URLSearchParams(window.location.search).get("table")?.slice(0,12);if(!scannedTable)return;const timer=window.setTimeout(()=>setTableNo(scannedTable),0);return()=>window.clearTimeout(timer)},[]);
  useEffect(()=>{window.scrollTo({top:0,behavior:"auto"})},[step]);
  const visibleProducts=useMemo(()=>{const q=query.trim().toLowerCase();return products.filter(p=>(category==="熱門推薦"?Boolean(p.featured||p.badge):p.category===category)&&(!q||`${p.name}${p.description}${p.category}`.toLowerCase().includes(q)))},[category,query]);
  const items=useMemo(()=>products.filter(p=>cart[p.id]).map(p=>({...p,quantity:cart[p.id],choices:choices[p.id]||[]})),[cart,choices]);
  const count=items.reduce((sum,item)=>sum+item.quantity,0); const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.price,0);
  const changeQuantity=(id:string,delta:number)=>setCart(current=>{const next=Math.max(0,(current[id]||0)+delta);const updated={...current,[id]:next};if(!next)delete updated[id];return updated});
  const openProduct=(product:Product)=>{setDetailProduct(product);setDetailQuantity(Math.max(1,cart[product.id]||1));setDetailChoices(choices[product.id]?.length?choices[product.id]:getChoiceGroups(product).map(group=>group.values[0]))};
  const selectDetailChoice=(groupIndex:number,value:string)=>setDetailChoices(current=>current.map((choice,index)=>index===groupIndex?value:choice));
  const addDetailedProduct=()=>{if(!detailProduct)return;setCart(current=>({...current,[detailProduct.id]:detailQuantity}));setChoices(current=>({...current,[detailProduct.id]:detailChoices}));setDetailProduct(null)};
  const choosePayment=(method:PaymentMethod,channel:PaymentChannel)=>{setPaymentMethod(method);setPaymentChannel(channel);setError("")};
  const submitOrder=async()=>{setLoading(true);setError("");try{const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({storeId:"senri-demo",tableNo,paymentMethod,paymentChannel,customerNote:note,items:items.map(item=>({productId:item.id,productName:item.choices.length?`${item.name}（${item.choices.join("・")}）`:item.name,quantity:item.quantity,unitPrice:item.price}))})});const result=await response.json() as {order?:CreatedOrder;error?:string};if(!response.ok||!result.order)throw new Error(result.error||"訂單送出失敗");setCreatedOrder(result.order);setStep("success")}catch(err){setError(err instanceof Error?err.message:"連線失敗，請再試一次")}finally{setLoading(false)}};

  if(step==="welcome") return <main className="customer-app-shell scan-entry-shell"><section className="customer-app scan-entry-page">
    <header className="scan-brand"><span className="scan-brand-mark">R</span><b>Rootable 森根</b></header>
    <div className="scan-entry-photo"><img src="/menu/chicken.jpg" alt="炙燒雞腿搭配米飯與季節蔬菜"/></div>
    <div className="scan-entry-card"><p className="customer-kicker">歡迎使用桌邊點餐</p><h1>森日小館</h1><p className="scan-entry-address">高雄鹽埕・今日供餐至 20:30</p>
      <div className="scan-order-mode"><span>用餐方式</span><strong>內用・餐點送到桌</strong><span>桌號</span><strong>{tableNo}</strong></div>
      <label className="scan-table-field" htmlFor="scan-table">確認桌號</label><input id="scan-table" value={tableNo} onChange={e=>setTableNo(e.target.value)} maxLength={12} autoComplete="off"/>
      <p className="scan-entry-help">請確認桌牌上的號碼，送出後餐點會依此桌號出餐。</p><button className="scan-start-button" onClick={()=>setStep("menu")} disabled={!tableNo.trim()}>開始點餐</button><a className="scan-help-link" href="/">需要協助？請洽店員</a>
    </div></section></main>;

  if(step==="success"&&createdOrder) return <main className="customer-app-shell success-shell"><section className="customer-app order-success-page" aria-live="polite"><div className="success-card">
    <div className="success-seal" aria-hidden="true">✓</div><p className="customer-kicker">訂單已送到廚房</p><h1>完成！請在座位稍候</h1><p className="success-help">餐點完成後，店員會送至您的桌位。</p>
    <div className="pickup-ticket"><span>訂單編號</span><strong>{createdOrder.orderNo}</strong></div><dl className="success-meta"><div><dt>桌號</dt><dd>{createdOrder.tableNo}</dd></div><div><dt>金額</dt><dd>{money(createdOrder.subtotal)}</dd></div><div><dt>付款</dt><dd>{createdOrder.paymentStatus==="paid"?"模擬付款完成":"餐後付現"}</dd></div></dl>
    <div className="order-progress"><span className="active">訂單送出</span><span>店家接單</span><span>餐點送達</span></div><p className="demo-notice">試營運模擬付款，不會產生真實扣款。</p><button className="customer-primary-action" onClick={()=>{setCart({});setChoices({});setStep("menu");setCreatedOrder(null)}}>繼續加點</button>
  </div></section></main>;

  if(step==="checkout") return <main className="customer-app-shell checkout-shell"><section className="customer-app checkout-page">
    <header className="customer-step-header"><button className="back-button" onClick={()=>setStep("menu")} aria-label="返回菜單">返回</button><div><b>確認訂單</b><span>桌邊點餐・桌號 {tableNo}</span></div><span className="step-count">{count} 份</span></header>
    <div className="checkout-content"><section className="checkout-block" aria-labelledby="order-review-title"><div className="checkout-block-title"><h1 id="order-review-title">您的餐點</h1><button className="add-more-link" onClick={()=>setStep("menu")}>繼續加點</button></div><div className="checkout-items">{items.map(item=><article className="checkout-item" key={item.id}><img src={item.image} alt=""/><div className="checkout-item-copy"><h2>{item.name}</h2>{item.choices.length>0&&<small>{item.choices.join("・")}</small>}<p>{money(item.price)}</p></div><div className="qty-control"><button onClick={()=>changeQuantity(item.id,-1)} aria-label={`減少${item.name}`}>−</button><span>{item.quantity}</span><button onClick={()=>changeQuantity(item.id,1)} aria-label={`增加${item.name}`}>＋</button></div></article>)}</div><dl className="checkout-totals"><div><dt>餐點小計</dt><dd>{money(subtotal)}</dd></div><div><dt>顧客服務費</dt><dd>NT$ 0</dd></div><div><dt>應付金額</dt><dd>{money(subtotal)}</dd></div></dl></section>
      <section className="checkout-block dining-confirmation"><div className="checkout-block-title"><h2>送餐資訊</h2><button onClick={()=>setStep("welcome")}>修改</button></div><p><b>內用・桌號 {tableNo}</b><span>餐點完成後由店員送至桌邊</span></p><div className="field-group compact-field"><label htmlFor="note">餐點備註 <span>選填</span></label><textarea id="note" value={note} onChange={e=>setNote(e.target.value)} placeholder="例如：不要香菜、餐具 2 份" maxLength={80}/><small>{note.length}/80</small></div></section>
      <fieldset className="checkout-block payment-options"><legend>選擇付款方式</legend><p className="payment-helper">顧客不加價；目前 LINE Pay 與 Apple Pay 為試營運模擬。</p>
        <button type="button" className={`payment-option ${paymentMethod==="cash"?"selected":""}`} onClick={()=>choosePayment("cash","cash")} aria-pressed={paymentMethod==="cash"}><span className="payment-radio"/><span><b>餐後至櫃台付現</b><small>送出後店家直接開始備餐</small></span><strong>免手續費</strong></button>
        <button type="button" className={`payment-option ${paymentChannel==="line_pay"?"selected":""}`} onClick={()=>choosePayment("rootable_pay","line_pay")} aria-pressed={paymentChannel==="line_pay"}><span className="payment-radio"/><span><b>LINE Pay</b><small>Rootable 代支付・模擬</small></span><strong>立即付款</strong></button>
        <button type="button" className={`payment-option ${paymentChannel==="apple_pay"?"selected":""}`} onClick={()=>choosePayment("rootable_pay","apple_pay")} aria-pressed={paymentChannel==="apple_pay"}><span className="payment-radio"/><span><b>Apple Pay</b><small>Rootable 代支付・模擬</small></span><strong>快速確認</strong></button></fieldset>{error&&<p className="form-error" role="alert">{error}</p>}
    </div><footer className="checkout-footer"><div><span>應付金額</span><strong>{money(subtotal)}</strong></div><button onClick={submitOrder} disabled={loading||!tableNo.trim()||!count}>{loading?"正在送出…":paymentMethod==="cash"?"確認送出訂單":`模擬支付 ${money(subtotal)}`}</button><p>送出前請確認桌號與餐點；模擬付款不會扣款。</p></footer>
  </section></main>;

  return <main className="customer-app-shell"><section className="customer-app menu-page mcd-flow">
    <header className="customer-store-header"><button className="customer-home-link" onClick={()=>setStep("welcome")} aria-label="返回桌號確認">R</button><div className="customer-store-title"><span>內用・餐點送到桌</span><h1>森日小館</h1></div><button className="table-chip" onClick={()=>setStep("welcome")} aria-label={`修改桌號，目前是${tableNo}`}><span>桌號</span><b>{tableNo}</b></button></header>
    <div className="service-banner"><span>現在接單中</span><b>預計 15–20 分鐘</b></div><div className="menu-search"><SearchIcon/><label className="sr-only" htmlFor="menu-search-input">搜尋餐點</label><input id="menu-search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋餐點或飲品" type="search"/></div>
    <div className="category-tabs" aria-label="菜單分類" role="tablist">{categories.map(item=><button role="tab" aria-selected={category===item} className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}>{item}</button>)}</div>
    <section className="menu-content" aria-labelledby="menu-title">{category==="熱門推薦"&&!query&&<button className="featured-promo" onClick={()=>openProduct(products[0])}><span><small>本日人氣推薦</small><b>炙燒照燒雞腿定食</b><em>查看餐點</em></span><img src="/menu/chicken.jpg" alt="炙燒照燒雞腿定食"/></button>}
      <div className="section-heading"><div><p className="customer-kicker">{query?"搜尋結果":"完整菜單"}</p><h2 id="menu-title">{query?`「${query}」`:category}</h2></div><p>{visibleProducts.length} 項餐點</p></div>
      <div className="product-grid">{visibleProducts.map(product=>{const quantity=cart[product.id]||0;return <article className={`menu-card ${quantity?"selected":""}`} key={product.id}><button className="menu-card-main" onClick={()=>openProduct(product)} aria-label={`查看${product.name}詳情`}><div className="menu-card-copy">{product.featured&&<span className="featured-label">店長推薦</span>}<h3>{product.name}</h3><p>{product.description}</p><div className="menu-card-price"><b>{money(product.price)}</b><span>起</span></div></div><figure className="food-photo"><img src={product.image} alt={product.imageAlt} loading="lazy"/><figcaption>{product.badge&&<b>{product.badge}</b>}</figcaption></figure></button><div className="menu-card-action">{quantity?<div className="qty-control"><button onClick={()=>changeQuantity(product.id,-1)} aria-label={`減少${product.name}`}>−</button><span>{quantity}</span><button onClick={()=>changeQuantity(product.id,1)} aria-label={`增加${product.name}`}>＋</button></div>:<button className="add-button" onClick={()=>openProduct(product)}>選擇</button>}</div></article>})}</div>
      {!visibleProducts.length&&<div className="menu-empty"><b>找不到符合的餐點</b><p>試試其他關鍵字或切換菜單分類。</p><button onClick={()=>setQuery("")}>清除搜尋</button></div>}<p className="menu-photo-note">餐點照片為擺盤示意；實際內容依當日食材為準。照片來源：Pexels。</p>
    </section>{count>0&&<div className="cart-dock" aria-live="polite"><div className="cart-quantity"><span>{count}</span><p>購物車</p></div><button onClick={()=>setStep("checkout")}><span>查看訂單</span><strong>{money(subtotal)}</strong></button></div>}
    {detailProduct&&<div className="product-sheet-backdrop"><section className="product-sheet" role="dialog" aria-modal="true" aria-labelledby="product-sheet-title"><div className="product-sheet-handle"/><button className="product-sheet-close" onClick={()=>setDetailProduct(null)} aria-label="關閉餐點詳情"><CloseIcon/></button><img className="product-sheet-photo" src={detailProduct.image} alt={detailProduct.imageAlt}/><div className="product-sheet-content">{detailProduct.badge&&<span className="featured-label">{detailProduct.badge}</span>}<h2 id="product-sheet-title">{detailProduct.name}</h2><p>{detailProduct.description}</p><strong>{money(detailProduct.price)}</strong>{getChoiceGroups(detailProduct).map((group,groupIndex)=><fieldset className="choice-group" key={group.label}><legend>{group.label}<small>必選</small></legend><div>{group.values.map(value=><button type="button" key={value} className={detailChoices[groupIndex]===value?"selected":""} onClick={()=>selectDetailChoice(groupIndex,value)} aria-pressed={detailChoices[groupIndex]===value}><span className="choice-radio"/>{value}</button>)}</div></fieldset>)}</div><footer className="product-sheet-footer"><div className="qty-control"><button onClick={()=>setDetailQuantity(value=>Math.max(1,value-1))} aria-label="減少數量">−</button><span>{detailQuantity}</span><button onClick={()=>setDetailQuantity(value=>value+1)} aria-label="增加數量">＋</button></div><button className="sheet-add-button" onClick={addDetailedProduct}>{cart[detailProduct.id]?"更新購物車":"加入購物車"}<strong>{money(detailProduct.price*detailQuantity)}</strong></button></footer></section></div>}
  </section></main>;
}
