import Link from "next/link";

export const metadata = {
  title: "Rootable 森根｜讓小店從一張 QR Code 開始數位化",
  description: "顧客掃碼點餐、現金或行動支付，店家用平板接單與處理。",
};

const sampleOrders = [
  { table: "A03", items: "森野定食 × 2", total: "$560", status: "新訂單" },
  { table: "B01", items: "手沖咖啡 × 1", total: "$180", status: "製作中" },
  { table: "外帶", items: "栗香拿鐵 × 2", total: "$320", status: "可取餐" },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Rootable 森根首頁">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Rootable <b>森根</b></span>
        </Link>
        <nav aria-label="主要導覽">
          <a href="#how">怎麼運作</a>
          <a href="#pricing">收費方式</a>
          <Link className="header-cta" href="/merchant">店家試用</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">給台灣小店的無紙化營運工具</p>
          <h1>一張 QR Code，<br />點餐、接單、收款都到位。</h1>
          <p className="hero-lede">
            不用換 POS，也不用先學複雜系統。顧客手機掃碼完成點餐，店家在平板立即接單；收現金或開通代支付，都能用同一套流程完成。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/menu">體驗顧客點餐</Link>
            <Link className="button button-secondary" href="/merchant">查看店家接單</Link>
          </div>
          <div className="trust-row" aria-label="服務特色">
            <span>免費開店</span><span>現金也能用</span><span>免換既有 POS</span>
          </div>
        </div>

        <div className="product-scene" aria-label="Rootable 顧客點餐與店家接單畫面示意">
          <div className="phone-frame">
            <div className="phone-top"><span>森日小館</span><span>桌號 A03</span></div>
            <div className="dish-photo" aria-hidden="true"><span>本日推薦</span></div>
            <div className="phone-content">
              <p className="mini-label">主餐</p><h2>森野炙燒雞腿定食</h2><p>每日蔬菜、味噌湯與小缽</p>
              <div className="price-row"><b>$280</b><span className="add-control">−&nbsp;&nbsp; 2 &nbsp;&nbsp;+</span></div>
              <div className="checkout-bar"><span>2 項餐點</span><b>查看購物車 $560</b></div>
            </div>
          </div>

          <div className="tablet-frame">
            <div className="tablet-head"><div><p className="mini-label">今日營運</p><h2>午安，森日小館</h2></div><span className="live-pill">接單中</span></div>
            <div className="order-summary"><span><b>3</b> 待處理</span><span><b>8</b> 製作中</span><span><b>24</b> 已完成</span></div>
            <div className="order-list">
              {sampleOrders.map((order) => (
                <article className="order-card" key={`${order.table}-${order.status}`}>
                  <div className="order-table">{order.table}</div>
                  <div><b>{order.items}</b><small>{order.total}</small></div><span>{order.status}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="steps-section" id="how">
        <div className="section-intro"><p className="eyebrow">從進店到出餐</p><h2>小店今天就能開始，不必重做整間店。</h2><p>Rootable 把顧客端與店家端接在一起，既有 POS、紙本流程與現金收款都能保留。</p></div>
        <div className="step-grid">
          <article><span>01</span><h3>掃碼點餐</h3><p>顧客掃桌牌 QR Code，看菜單、選數量與留下備註。</p></article>
          <article><span>02</span><h3>選擇付款</h3><p>可到店付現，也可使用 Rootable 代支付完成行動付款。</p></article>
          <article><span>03</span><h3>平板接單</h3><p>店家立即看到桌號、餐點與付款狀態，依流程處理。</p></article>
          <article><span>04</span><h3>完成結算</h3><p>現金由店家直接收；代支付訂單按月產出透明結算。</p></article>
        </div>
      </section>

      <section className="payment-section" id="pricing">
        <div className="section-intro light"><p className="eyebrow">讓店家願意用的收費</p><h2>先免費解決日常，再從真正省事的交易收費。</h2><p>顧客不加價，店家也不必先承擔月租。需要代支付時，才按成功交易計費。</p></div>
        <div className="pricing-grid">
          <article className="price-card"><p className="price-kicker">現金模式</p><h3>免費開始</h3><strong>0<small> 元／月</small></strong><ul><li>QR Code 菜單與點餐</li><li>平板接單與進度管理</li><li>店家現場自行收現</li><li>不抽現金訂單手續費</li></ul><Link className="button button-secondary" href="/menu">體驗現金點餐</Link></article>
          <article className="price-card featured"><span className="recommended">建議試營運方案</span><p className="price-kicker">Rootable 代支付</p><h3>有交易才付費</h3><strong>3.9%<small>／成功交易，未稅</small></strong><ul><li>LINE Pay／Apple Pay 模擬流程</li><li>顧客端不加收服務費</li><li>付款狀態與訂單自動對應</li><li>每月結算與明細報表</li></ul><Link className="button button-primary" href="/merchant">查看結算後台</Link></article>
        </div>
        <p className="pricing-footnote">前 30 家示範店可採 90 天 3.5% 試營運費率；正式金流上線前，將由完成法遵登錄的支付夥伴處理價金保管與支付。</p>
      </section>

      <section className="ecosystem-section">
        <div className="ecosystem-copy"><p className="eyebrow">從工具長成生意</p><h2>Rootable 是根系，讓小店被看見、被選擇，也更好經營。</h2><p>承接簡報中的森藏、SeedLab 與東瑭資源：免費工具先幫店家扎根，後續再把餐券、探店內容與實體桌牌接進同一條成長路徑。</p></div>
        <div className="ecosystem-map" aria-label="Rootable 生態系"><div className="root-node"><b>Rootable 森根</b><span>點餐・接單・收款</span></div><div><b>森藏 SENZO</b><span>餐券與會員交易</span></div><div><b>SeedLab</b><span>探店與內容導流</span></div><div><b>東瑭</b><span>桌牌與現場物料</span></div></div>
      </section>

      <section className="final-cta"><p className="eyebrow">90 天試營運</p><h2>先讓 30 家小店真的用起來。</h2><p>顧客掃碼下單、店家平板接單、現金與代支付並行。從一條完整流程開始驗證。</p><div><Link className="button button-primary" href="/menu">體驗顧客點餐</Link><Link className="button button-secondary" href="/merchant">開啟店家平板</Link></div></section>

      <footer className="site-footer"><Link className="brand" href="/"><span className="brand-mark">R</span><span>Rootable <b>森根</b></span></Link><p>讓每間小店，都能用自己的步調長出數位根系。</p><span>試營運版本・模擬付款</span></footer>
    </main>
  );
}
