/* Shareable progress card: a picture of your streak and week that you can save or post. It is drawn on this device. */
const sh = { data: null, quiz: null, showName: true };

function shRound(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

function drawCard() {
  const d = sh.data; const cv = $('shCanvas'); const W = 1080; const H = 1350;
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const font = '"Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif';
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#c4467d'); g.addColorStop(1, '#7d1f48');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(W - 120, 140, 330, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(60, H - 80, 260, 0, Math.PI * 2); c.fill();

  c.fillStyle = '#fff'; c.textAlign = 'left';
  c.font = `700 56px ${font}`; c.fillText('Ibadah360', 80, 130);
  c.font = `400 34px ${font}`; c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillText(d.hijri.text, 80, 184);
  if (sh.showName) { c.font = `600 44px ${font}`; c.fillStyle = '#fff'; c.fillText(d.name, 80, 270); }

  // streak
  shRound(c, 80, 330, W - 160, 380, 40); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill();
  c.textAlign = 'center'; c.fillStyle = '#fff';
  c.font = `800 200px ${font}`; c.fillText(String(d.prayers.streak), W / 2, 560);
  c.font = `600 44px ${font}`; c.fillText(d.prayers.streak === 1 ? 'day streak' : 'day streak', W / 2, 626);
  c.font = `400 32px ${font}`; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText('all 5 prayers on time', W / 2, 676);

  // week bars
  const bx = 120; const bw = 96; const gap = (W - 240 - bw * 7) / 6; const top = 785; const bh = 190;
  d.week.forEach((day, i) => {
    const x = bx + i * (bw + gap);
    shRound(c, x, top, bw, bh, 20); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill();
    const f = Math.max(0, Math.min(5, day.count)) / 5;
    if (f > 0) { shRound(c, x, top + bh - bh * f, bw, bh * f, 20); c.fillStyle = f === 1 ? '#f3c98b' : '#fff'; c.fill(); }
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `600 30px ${font}`; c.textAlign = 'center';
    c.fillText(day.label, x + bw / 2, top + bh + 44);
  });
  c.font = `400 30px ${font}`; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText('prayers this week', W / 2, 1082);

  // numbers
  const stats = [[`${d.quran.percent}%`, 'of the Quran read'], [String(d.quran.parasDone), 'paras finished']];
  if (sh.quiz && sh.quiz.completed) stats.push([String(sh.quiz.streak), 'day quiz streak']);
  const cw = (W - 160 - 30 * (stats.length - 1)) / stats.length;
  stats.forEach((s, i) => {
    const x = 80 + i * (cw + 30);
    shRound(c, x, 1118, cw, 140, 28); c.fillStyle = 'rgba(255,255,255,.16)'; c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `800 60px ${font}`; c.fillText(s[0], x + cw / 2, 1186);
    c.font = `400 26px ${font}`; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText(s[1], x + cw / 2, 1228);
  });
  c.textAlign = 'center'; c.font = `400 28px ${font}`; c.fillStyle = 'rgba(255,255,255,.8)';
  c.fillText('Prayer · Quran · Learning', W / 2, 1310);
}

const shBlob = () => new Promise((res) => $('shCanvas').toBlob(res, 'image/png'));

async function loadShare() {
  $('shCanvas').replaceChildren();
  try {
    const [d, q] = await Promise.all([api('/dashboard'), api('/lesson/stats').catch(() => null)]);
    sh.data = d; sh.quiz = q;
    if (!sh.ready) {
      $('shName').onchange = () => { sh.showName = $('shName').checked; drawCard(); };
      $('shSave').onclick = async () => {
        const b = await shBlob();
        const a = mk('a'); a.href = URL.createObjectURL(b); a.download = 'ibadah360-progress.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      };
      $('shShare').onclick = async () => {
        const b = await shBlob();
        const file = new File([b], 'ibadah360-progress.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: 'My progress on Ibadah360' }); } catch (e) { /* closed by the person */ } }
        else toast('Sharing is not supported here. Use Save picture instead.', true);
      };
      sh.ready = true;
    }
    drawCard();
  } catch (e) { toast(e.message, true); }
}
