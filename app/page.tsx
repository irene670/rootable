/* eslint-disable @next/next/no-html-link-for-pages -- Native anchors avoid the deployed Vinext Link runtime crash. */

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
        <a className="brand" href="/" aria-label="Rootable 森根首頁">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>Rootable <b>森根</b></span>
        </a>
        <nav aria-label="主要導覽">
          <a href="#how">怎麼運作</a>
          <a href="#pricing">收費方式</a>
          <a href="#attribution">訂單歸因</a>
          <a className="header-cta" href="/start">免費開店</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">給台灣小店的無紙化營運工具</p>
          <h1>一張 QR Code，<br />點餐、接單、<br className="mobile-only-break" />收款都到位。</h1>
          <p className="hero-lede">
            不用換 POS，也不用先學複雜系統。顧客手機掃碼完成點餐，店家在平板立即接單；收現金或開通代支付，都能用同一套流程完成。
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="/s/senri/order?table=A03">體驗手機掃碼點餐</a>
            <a className="button button-secondary" href="/merchant/orders">開啟店家營運台</a>
          </div>
          <div className="trust-row" aria-label="服務特色">
            <span>免費開店</span><span>現金訂單 0%</span><span>顧客免平台費</span>
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

      <section className="role-entry" aria-label="選擇 Rootable 體驗入口">
        <header><p className="eyebrow">一套系統，三個現場角色</p><h2>不是把點餐頁做漂亮，而是讓每一筆訂單順利走完。</h2></header>
        <div>
          <a href="/s/senri/order?table=A03"><span>顧客手機</span><b>掃碼、一起點、付款</b><small>桌號自動帶入，餐點變體與多人訂單不必輪流傳手機。</small><em>開啟手機版 Demo</em></a>
          <a href="/merchant/orders"><span>外場平板</span><b>開桌、收現、追桌況</b><small>櫃台手動開單與 QR 訂單進入同一條餐務流程。</small><em>開啟營運工作台</em></a>
          <a href="/merchant/orders"><span>廚房出餐</span><b>看總量、分批上菜</b><small>先看現在總共要做幾份，再逐份核取、避免漏單。</small><em>查看餐務看板</em></a>
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

      <section className="paperless-mission" id="mission">
        <div className="mission-copy"><p className="eyebrow">森藏文教協會發起</p><h2>一張只畫兩個勾就被丟掉的點單紙，也值得被重新設計。</h2><p>我們在餐廳現場看見：許多紙本訂單只用來核對兩次，幾分鐘後就成為垃圾。Rootable 先把無紙點餐、現金收款與店家接單免費開放，讓小店不用先承擔成本，也能從每天少印幾張單開始。</p><div><span>無紙點餐永遠可免費開始</span><span>現金訂單 0 月租、0 抽成</span><span>付費功能保持自由選擇</span></div></div>
        <div className="mission-proof" aria-label="無紙化價值"><p>我們先衡量真正發生的改變</p><strong>少印的訂單張數</strong><span>不先換算成「救了幾棵樹」，避免誇大；店家後台會直接呈現本月完成的無紙訂單，讓成果可以核對。</span><a href="/merchant">查看店家實際流程</a></div>
      </section>

      <section className="payment-section" id="pricing">
        <div className="section-intro light"><p className="eyebrow">店家看得懂的三種訂單</p><h2>自己帶來的客人低費率，Rootable 帶來新客才收導流費。</h2><p>顧客不加價，店家不用先付月租；每一張訂單都標示來源、費率與預計實收。</p></div>
        <div className="pricing-grid">
          <article className="price-card"><p className="price-kicker">店內直客・現金</p><h3>日常點餐免費用</h3><strong>0%<small>／成功訂單</small></strong><ul><li>QR Code 菜單與平板接單</li><li>店家現場直接收現</li><li>不限現金訂單數量</li><li>不收月租與抽成</li></ul><a className="button button-secondary" href="/menu">體驗現金點餐</a></article>
          <article className="price-card featured"><span className="recommended">店內最省事</span><p className="price-kicker">店內直客・行動支付</p><h3>掃碼、付款、對帳一次完成</h3><strong>3.9%<small>／成功交易，未稅</small></strong><ul><li>LINE Pay／Apple Pay 模擬流程</li><li>顧客端不加收平台費</li><li>付款狀態與訂單自動對應</li><li>每月結算與明細報表</li></ul><a className="button button-primary" href="/merchant">查看結算後台</a></article>
          <article className="price-card acquisition"><span className="recommended">只收真正帶來的生意</span><p className="price-kicker">森藏發現・新客導流</p><h3>從 Rootable 找到店家並下單</h3><strong>15%<small>／歸因成功訂單</small></strong><ul><li>森藏選品與探店頁曝光</li><li>只計算平台帶來的訂單</li><li>店內桌牌掃碼不算導流</li><li>後台可逐筆查看歸因依據</li></ul><a className="button button-secondary" href="#attribution">查看怎麼判定</a></article>
        </div>
        <div className="growth-plan-note"><div><p className="price-kicker">可選的營運成長方案</p><h3>8% 不只是收款，而是把回訪與省工一起交付。</h3><p>若店家開啟會員、集點、優惠券、顧客通知與回訪、自動對帳及進階報表，可選 8% 成長服務費；只需要付款確認與月結的店家，仍保留 3.9% 基本代支付。</p></div><ul><li>自動確認付款與訂單</li><li>不必人工對帳</li><li>顧客通知與回訪</li><li>會員、集點與優惠券</li><li>降低櫃台工作與漏單</li><li>清楚的日結、月結報表</li></ul></div>
        <p className="pricing-footnote">目前為試營運模擬付款。正式代支付將串接合規支付夥伴，由支付夥伴完成店家審查、價金保管與撥款；Rootable 不自行把多店款項混入一般公司帳戶。</p>
      </section>

      <section className="attribution-section" id="attribution">
        <div className="attribution-copy"><p className="eyebrow">每張訂單都說得清楚</p><h2>不是看最後從哪裡結帳，而是看客人怎麼找到店家。</h2><p>我們把店家的既有客人與 Rootable 帶來的新客分開。桌牌、店家自己分享的網址都屬於直客；只有顧客先從森藏發現店家並完成訂單，才計入導流。</p></div>
        <div className="attribution-table" role="table" aria-label="Rootable 訂單歸因與費率">
          <div className="attribution-head" role="row"><span role="columnheader">顧客來源</span><span role="columnheader">付款方式</span><span role="columnheader">店家費率</span></div>
          <div role="row"><span role="cell"><b>店內桌牌／店家網址</b><small>店家自己的客人</small></span><span role="cell">現金</span><strong role="cell">0%</strong></div>
          <div role="row"><span role="cell"><b>店內桌牌／店家網址</b><small>店家自己的客人</small></span><span role="cell">行動支付</span><strong role="cell">3.9%</strong></div>
          <div className="attributed" role="row"><span role="cell"><b>森藏探索／Rootable 推薦</b><small>平台實際帶來的新訂單</small></span><span role="cell">現金或行動支付</span><strong role="cell">15%</strong></div>
        </div>
        <div className="attribution-rules">
          <article><span>01</span><h3>有憑據</h3><p>後台會在每張訂單標示「店內直客」或「森藏導流」，並保留下單時間供店家核對。</p></article>
          <article><span>02</span><h3>不重複抽</h3><p>導流訂單的 15% 已包含平台與代支付服務，不再另外加 3.9%。</p></article>
          <article><span>03</span><h3>不永久綁定</h3><p>同一位顧客之後回店掃桌牌，回到直客費率，不把熟客永遠算成平台客。</p></article>
        </div>
      </section>

      <section className="ecosystem-section">
        <div className="ecosystem-copy"><p className="eyebrow">森藏式的發現體驗</p><h2>先把小店的故事說好，再把真正想來的人帶進店。</h2><p>Rootable 延伸森藏再生的溫暖選品語彙：用地方專題、店家故事、人氣餐點與活動策展導流，不把平台做成只比價格的外送清單。</p></div>
        <div className="ecosystem-map" aria-label="Rootable 生態系"><div className="root-node"><b>Rootable 森根</b><span>點餐・接單・收款</span></div><div><b>森藏選品</b><span>地方專題與新客導流</span></div><div><b>SeedLab</b><span>探店內容與社群口碑</span></div><div><b>店家後台</b><span>逐筆歸因與成效報表</span></div></div>
      </section>

      <section className="final-cta"><p className="eyebrow">90 天試營運</p><h2>先讓 30 家小店真的用起來。</h2><p>顧客掃碼下單、店家平板接單、現金與代支付並行。從一條完整流程開始驗證。</p><div><a className="button button-primary" href="/s/senri/order?table=A03">體驗顧客點餐</a><a className="button button-secondary" href="/merchant">開啟店家後台</a></div></section>

      <footer className="site-footer"><a className="brand" href="/"><span className="brand-mark">R</span><span>Rootable <b>森根</b></span></a><p>讓每間小店，都能用自己的步調長出數位根系。</p><span>試營運版本・模擬付款</span></footer>
    </main>
  );
}
