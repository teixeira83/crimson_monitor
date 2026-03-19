const https = require("https");
const { exec } = require("child_process");

const PAGES = [
  {
    name: "Crimson Desert - Deluxe Edition",
    url: "https://www.instant-gaming.com/en/22143-buy-crimson-desert-deluxe-edition-pc-steam/?igr=EuSouoCap",
  },
  {
    name: "Crimson Desert - Standard Edition",
    url: "https://www.instant-gaming.com/en/22142-buy-crimson-desert-pc-steam/?igr=EuSouoCap",
  },
];

const CHECK_INTERVAL_MS = 60 * 1000; // 1 minute
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function timestamp() {
  return new Date().toLocaleString("pt-BR");
}

function notify(title, message, url) {
  // Windows toast notification via PowerShell
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms
    $balloon = New-Object System.Windows.Forms.NotifyIcon
    $balloon.Icon = [System.Drawing.SystemIcons]::Information
    $balloon.BalloonTipIcon = 'Info'
    $balloon.BalloonTipTitle = '${title.replace(/'/g, "''")}'
    $balloon.BalloonTipText = '${message.replace(/'/g, "''")}'
    $balloon.Visible = $true
    $balloon.ShowBalloonTip(10000)
    Start-Sleep -Seconds 5
    $balloon.Dispose()
  `;
  exec(
    `powershell -NoProfile -Command "${psScript.replace(/\n/g, " ")}"`,
    (err) => {
      if (err)
        console.log("  (toast notification failed, but alert is in console)");
    }
  );

  // Also open the URL in the default browser
  exec(`start "" "${url}"`);
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
      },
    };

    const request = https.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchPage(res.headers.location).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });

    request.on("error", reject);
    request.setTimeout(15000, () => {
      request.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function checkPage({ name, url }) {
  try {
    const html = await fetchPage(url);
    // Check both indicators: the JS-rendered "will-be-notified" class
    // and the server-rendered "notifstock" div with stock notification text
    const hasOutOfStock =
      html.includes("will-be-notified") ||
      html.includes('class="notifstock ') ||
      html.includes("notified by e-mail on stock availability");

    if (hasOutOfStock) {
      console.log(
        `[${timestamp()}] ${name}: ESGOTADO`
      );
    } else {
      console.log(
        `[${timestamp()}] *** ${name}: DISPONIVEL! *** -> ${url}`
      );
      notify(
        "CRIMSON DESERT DISPONIVEL!",
        `${name} esta disponivel na Instant Gaming!`,
        url
      );
    }
  } catch (err) {
    console.log(`[${timestamp()}] ${name}: ERRO - ${err.message}`);
  }
}

async function checkAll() {
  console.log(`[${timestamp()}] Verificando...`);
  await Promise.all(PAGES.map(checkPage));
  console.log("");
}

async function main() {
  console.log("=== Crimson Desert Stock Monitor ===");
  console.log(
    `Verificando ${PAGES.length} paginas a cada ${CHECK_INTERVAL_MS / 1000}s`
  );
  console.log("Pressione Ctrl+C para encerrar\n");

  await checkAll();
  setInterval(checkAll, CHECK_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
