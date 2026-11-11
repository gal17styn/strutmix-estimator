/* StrutMix v2 - satuan: mm, MPa, N, kg. Momen kN·m, gaya kN. Hitung otomatis tiap input berubah. */
const $ = id => document.getElementById(id), N = id => parseFloat($(id).value) || 0;
const f = (x, d = 2) => x.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const rp = x => 'Rp ' + Math.round(x).toLocaleString('id-ID');

// Koefisien tenaga (OH): pekerja, tukang, kepala tukang, mandor. INDIKATIF, cocokkan dengan AHSP resmi.
const KB = [1.65, .275, .028, .083];   // per m³ beton
const KW = [.3, .1, .01, .015];        // per m² pasangan bata
const KP = [.3, .15, .015, .015];      // per m² plesteran
// Data bata: p x t x l (cm), tebal spesi j (cm). Ringan = perekat tipis 0,3 cm.
const BATA = { 'Bata merah': { p: 22, t: 5, l: 11, j: 1, h: 'hBata1' }, 'Bata ringan': { p: 60, t: 20, l: 10, j: .3, h: 'hBata2' } };

const FIELDS = {
  glob: [['fc', "f'c (MPa)", 25], ['fy', 'fy (MPa)', 420], ['sel', 'Selimut (mm)', 40], ['dS', 'Ø sengkang (mm)', 10], ['agg', 'Agregat maks. (mm)', 19, [19, 25, 37.5]]],
  balok: [['b', 'Lebar b (mm)', 300], ['h', 'Tinggi h (mm)', 500], ['D', 'Ø tulangan tarik (mm)', 16], ['n', 'Jumlah batang', 4], ['Mu', 'Mu rencana (kN·m)', 100], ['L', 'Panjang balok (m)', 6], ['jml', 'Jumlah balok', 10]],
  kolom: [['bk', 'Lebar (mm)', 400], ['hk', 'Tinggi penampang (mm)', 400], ['Dk', 'Ø tulangan (mm)', 16], ['nk', 'Jumlah batang', 8], ['Pu', 'Pu rencana (kN)', 1200], ['Hk', 'Tinggi kolom (m)', 3.5], ['jk', 'Jumlah kolom', 12]],
  dinding: [['Pd', 'Panjang dinding (m)', 20], ['Td', 'Tinggi dinding (m)', 3.5], ['bkn', 'Luas bukaan (m²)', 10], ['jenis', 'Jenis bata', 'Bata merah', ['Bata merah', 'Bata ringan']], ['sisi', 'Sisi diplester', 2, [0, 1, 2]]],
  rab: [['hSemen', 'Semen /kg', 1500], ['hPasir', 'Pasir /kg', 200], ['hKerikil', 'Kerikil /kg', 250], ['hAir', 'Air /liter', 25], ['hBesi', 'Besi /kg', 15000], ['hBata1', 'Bata merah /buah', 1000], ['hBata2', 'Bata ringan /buah', 9000], ['op', 'Overhead & profit (%)', 10], ['uP', 'Upah pekerja /OH', 120000], ['uT', 'Upah tukang /OH', 150000], ['uK', 'Upah kep. tukang /OH', 170000], ['uM', 'Upah mandor /OH', 180000]],
  sim: [['param', 'Parameter balok', 'Tinggi h (mm)', ['Tinggi h (mm)', 'Lebar b (mm)', "f'c (MPa)", 'Jumlah tulangan']], ['lo', 'Nilai awal', 300], ['hi', 'Nilai akhir', 800]]
};
const PAN = { balok: 'Balok', kolom: 'Kolom', dinding: 'Dinding bata', rab: 'RAB', sim: 'Simulasi' };
const SIMP = { 'Tinggi h (mm)': ['h', 300, 800], 'Lebar b (mm)': ['b', 200, 500], "f'c (MPa)": ['fc', 20, 40], 'Jumlah tulangan': ['n', 2, 10] };

const form = a => a.map(([id, l, v, o]) => `<label>${l}${o ? `<select id="${id}">${o.map(x => `<option ${x == v ? 'selected' : ''}>${x}</option>`).join('')}</select>` : `<input id="${id}" type="number" step="any" value="${v}">`}</label>`).join('');
$('glob').innerHTML = form(FIELDS.glob);
$('app').innerHTML = Object.keys(PAN).map(k => `<section class="panel" id="p-${k}"><div class="card"><h2>${PAN[k]}</h2><div class="grid2">${form(FIELDS[k])}</div></div><div class="card" id="o-${k}"></div></section>`).join('');
$('nav').innerHTML = Object.keys(PAN).map(k => `<button data-k="${k}">${PAN[k]}</button>`).join('');
$('nav').onclick = e => { const k = e.target.dataset.k; if (!k) return; document.querySelectorAll('.panel,.pill button').forEach(x => x.classList.remove('on')); $('p-' + k).classList.add('on'); e.target.classList.add('on'); };
$('nav').querySelector('button').click();

// Ilustrasi rangka bangunan di hero
$('bld').innerHTML = [...Array(5)].map((_, i) => `<line x1="20" x2="380" y1="${30 + i * 38}" y2="${30 + i * 38}"/>`).join('') +
  [...Array(7)].map((_, i) => `<line y1="30" y2="182" x1="${20 + i * 60}" x2="${20 + i * 60}"/>`).join('') +
  '<rect class="hl" x="80" y="68" width="120" height="76"/><line x1="20" y1="30" x2="140" y2="106"/><line x1="380" y1="30" x2="260" y2="106"/>';

// ---------- Rumus ----------
// Mix design disederhanakan (SNI 7656:2012 / ACI 211.1), slump 75-100 mm
function interp(t, x) { if (x <= t[0][0]) return t[0][1]; for (let i = 0; i < t.length - 1; i++) { const [a, ya] = t[i], [b, yb] = t[i + 1]; if (x <= b) return ya + (yb - ya) * (x - a) / (b - a); } return t[t.length - 1][1]; }
function mixOf(fc, ag) {
  const fcr = fc < 21 ? fc + 7 : fc <= 35 ? fc + 8.5 : 1.1 * fc + 5;               // kuat tekan target
  const fas = Math.max(.35, interp([[15, .79], [20, .69], [25, .61], [30, .54], [35, .47], [40, .42]], fcr)); // faktor air-semen
  const t = { 19: [205, .62, 2], 25: [193, .67, 1.5], 37.5: [181, .71, 1] }[ag];     // air, vol. kerikil, % udara
  const air = t[0], semen = air / fas, kerikil = t[1] * 1600;                         // berat isi kerikil 1600 kg/m³
  const pasir = (1000 - t[2] * 10 - air - semen / 3.15 - kerikil / 2.65) * 2.6;       // volume absolut (BJ 3,15 / 2,65 / 2,6)
  return { fcr, fas, air, semen, kerikil, pasir };
}
// Balok persegi tulangan tunggal (SNI 2847:2019)
function beam(b, h, D, n, fc) {
  const fy = N('fy'), d = h - N('sel') - N('dS') - D / 2;          // tinggi efektif
  const As = n * Math.PI / 4 * D * D;                                // luas tulangan tarik
  const b1 = fc <= 28 ? .85 : Math.max(.65, .85 - .05 * (fc - 28) / 7);
  const a = As * fy / (.85 * fc * b), c = a / b1;                    // blok tegangan & garis netral
  const Mn = As * fy * (d - a / 2) / 1e6;                            // momen nominal (kN·m)
  const et = .003 * (d - c) / c, ey = fy / 2e5;                      // regangan baja
  const phi = et >= .005 ? .9 : et <= ey ? .65 : .65 + .25 * (et - ey) / (.005 - ey);
  const AsMin = Math.max(.25 * Math.sqrt(fc) / fy, 1.4 / fy) * b * d;
  return { d, As, a, c, Mn, et, phi, pMn: phi * Mn, AsMin };
}
const wages = () => ['uP', 'uT', 'uK', 'uM'].map(N);
const dot = (k, w) => k.reduce((s, x, i) => s + x * w[i], 0);
const costM3 = (fc, m) => m.semen * N('hSemen') + m.pasir * N('hPasir') + m.kerikil * N('hKerikil') + m.air * N('hAir') + dot(KB, wages());

const k = (l, v, a) => `<div class="k ${a ? 'a' : ''}"><small>${l}</small><b>${v}</b></div>`;
const chk = (ok, t) => `<li class="${ok ? 'ok' : 'bad'}">${ok ? '✔' : '⚠'} ${t}</li>`;
const col = r => r > 100 ? 'var(--bad)' : r > 85 ? 'var(--o)' : 'var(--ok)';
const gauge = (t, pct) => `<div class="g"><div class="gh">${t}</div><div class="gv">${f(pct, 1)}%</div><svg viewBox="0 0 120 70"><path d="M10 60A50 50 0 0 1 110 60" pathLength="100" fill="none" stroke="#e8ebe5" stroke-width="10" stroke-linecap="round"/><path d="M10 60A50 50 0 0 1 110 60" pathLength="100" fill="none" stroke="${col(pct)}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${Math.min(pct, 100)} 100"/></svg></div>`;
let RAB = null;

function calc() {
  const fc = N('fc'), fy = N('fy'), mix = mixOf(fc, N('agg'));

  // ----- BALOK -----
  const b = N('b'), h = N('h'), bm = beam(b, h, N('D'), N('n'), fc), Mu = N('Mu');
  const rB = Mu / bm.pMn * 100, s = 150 / Math.max(b, h), W = b * s, H = h * s, x0 = (200 - W) / 2, y0 = 10, cv = N('sel') * s, dr = N('D') * s / 2;
  const dots = [...Array(Math.max(1, N('n')))].map((_, i, a) => `<circle cx="${x0 + cv + dr + (a.length > 1 ? i * (W - 2 * cv - 2 * dr) / (a.length - 1) : (W - 2 * cv) / 2)}" cy="${y0 + H - cv - dr}" r="${Math.max(dr, 2)}" fill="#14171a"/>`).join('');
  $('o-balok').innerHTML = `<div class="kp">${k('Mn (kN·m)', f(bm.Mn), 1)}${k('φMn (kN·m)', f(bm.pMn), 1)}${k('d (mm)', f(bm.d, 0))}${k('As (mm²)', f(bm.As, 0))}${k('a (mm)', f(bm.a, 1))}${k('εt', f(bm.et, 4))}</div>
    <div class="sec"><svg viewBox="0 0 200 170"><rect x="${x0}" y="${y0}" width="${W}" height="${H}" fill="#e8ebe5" stroke="#14171a" stroke-width="2"/><rect x="${x0 + cv}" y="${y0 + cv}" width="${W - 2 * cv}" height="${H - 2 * cv}" fill="none" stroke="#f08a3c" stroke-width="2"/>${dots}</svg></div>
    <ul>${chk(bm.As >= bm.AsMin, `As ≥ As,min (${f(bm.AsMin, 0)} mm²)`)}${chk(bm.et >= .004, 'εt ≥ 0,004 (penampang daktail)')}${chk(Mu <= bm.pMn, `Mu ≤ φMn (rasio ${f(rB, 1)}%)`)}</ul>`;

  // ----- KOLOM (sengkang, SNI 2847:2019): φPn,max = 0,8·φ·[0,85·f'c·(Ag-Ast) + fy·Ast], φ = 0,65 -----
  const bk = N('bk'), hk = N('hk'), Ag = bk * hk, Ast = N('nk') * Math.PI / 4 * N('Dk') ** 2, rho = Ast / Ag * 100;
  const pPn = .8 * .65 * (.85 * fc * (Ag - Ast) + fy * Ast) / 1000, Pu = N('Pu'), rK = Pu / pPn * 100;
  const lr = N('Hk') * 1000 / (.3 * Math.min(bk, hk));  // kelangsingan kl/r, k=1, r=0,3·h
  $('o-kolom').innerHTML = `<div class="kp">${k('φPn,max (kN)', f(pPn, 0), 1)}${k('Rasio Pu/φPn', f(rK, 1) + '%', 1)}${k('Ag (mm²)', f(Ag, 0))}${k('Ast (mm²)', f(Ast, 0))}${k('ρg (%)', f(rho))}${k('kl/r', f(lr, 1))}</div>
    <ul>${chk(rho >= 1 && rho <= 8, 'ρg antara 1% dan 8%')}${chk(N('nk') >= 4, 'Minimal 4 batang tulangan')}${chk(lr <= 22, 'kl/r ≤ 22 (kolom pendek, efek kelangsingan boleh diabaikan)')}${chk(Pu <= pPn, 'Pu ≤ φPn,max')}</ul>
    <p class="note">Hanya beban aksial konsentris. Kolom dengan momen perlu diagram interaksi P-M.</p>`;

  // ----- DINDING BATA -----
  const bt = BATA[$('jenis').value], A = Math.max(0, N('Pd') * N('Td') - N('bkn')), pl = N('sisi');
  const nM2 = 1 / (((bt.p + bt.j) / 100) * ((bt.t + bt.j) / 100));      // bata per m² (termasuk tebal spesi)
  const spesiM2 = bt.l / 100 - nM2 * bt.p * bt.t * bt.l / 1e6;           // volume spesi per m² = tebal dinding - volume bata
  const nBata = nM2 * A * 1.05, Ap = A * pl, vMor = (spesiM2 * A + Ap * .015) * 1.1; // waste bata 5%, spesi 10%, plester 1,5 cm
  const semenW = 325 * vMor, pasirW = 1.05 * 1400 * vMor;                 // 1 semen : 4 pasir (indikatif): 325 kg semen & 1,05 m³ pasir per m³ spesi
  $('o-dinding').innerHTML = `<div class="kp">${k('Luas bersih (m²)', f(A), 1)}${k('Bata (buah)', f(nBata, 0), 1)}${k('Bata /m²', f(nM2, 1))}${k('Spesi+plester (m³)', f(vMor, 3))}${k('Semen (kg)', f(semenW, 0))}${k('Pasir (kg)', f(pasirW, 0))}</div>
    <p class="note">Waste bata 5%, spesi 10%. Plester 1,5 cm per sisi. Campuran 1:4 bersifat indikatif.</p>`;

  // ----- RAB -----
  const vB = b / 1000 * h / 1000 * N('L') * N('jml'), vK = bk / 1000 * hk / 1000 * N('Hk') * N('jk'), V = vB + vK;
  const besi = (bm.As * N('L') * N('jml') + Ast * N('Hk') * N('jk')) * 1e-6 * 7850;
  const labQ = KB.map((x, i) => x * V + KW[i] * A + KP[i] * Ap), nm = ['Pekerja', 'Tukang batu', 'Kepala tukang', 'Mandor'], w = wages();
  const rows = [['Semen (beton)', 'kg', mix.semen * V, N('hSemen')], ['Pasir (beton)', 'kg', mix.pasir * V, N('hPasir')], ['Kerikil', 'kg', mix.kerikil * V, N('hKerikil')], ['Air', 'liter', mix.air * V, N('hAir')],
    ['Besi tulangan utama', 'kg', besi, N('hBesi')], [$('jenis').value, 'buah', nBata, N(bt.h)], ['Semen (spesi/plester)', 'kg', semenW, N('hSemen')], ['Pasir (spesi/plester)', 'kg', pasirW, N('hPasir')],
    ...nm.map((n, i) => [n, 'OH', labQ[i], w[i]])].map(([a, u, q, p]) => ({ a, u, q, p, j: q * p }));
  const sub = rows.reduce((t, r) => t + r.j, 0), ov = sub * N('op') / 100;
  RAB = { rows, sub, ov, tot: sub + ov };
  $('o-rab').innerHTML = `<p class="note">Volume beton: balok ${f(vB)} m³ + kolom ${f(vK)} m³ = ${f(V)} m³. Mix: fas ${f(mix.fas)}, semen ${f(mix.semen, 0)} kg/m³.</p><table><tr><th>Uraian</th><th>Sat.</th><th class="r">Volume</th><th class="r">Harga</th><th class="r">Jumlah</th></tr>` +
    rows.map(r => `<tr><td>${r.a}</td><td>${r.u}</td><td class="r">${f(r.q)}</td><td class="r">${rp(r.p)}</td><td class="r">${rp(r.j)}</td></tr>`).join('') +
    `<tr><td colspan="4">Subtotal</td><td class="r">${rp(sub)}</td></tr><tr><td colspan="4">Overhead &amp; profit (${N('op')}%)</td><td class="r">${rp(ov)}</td></tr><tr class="t"><td colspan="4">TOTAL</td><td class="r">${rp(RAB.tot)}</td></tr></table><button class="btn" id="csv">Unduh CSV</button>`;
  $('csv').onclick = () => {
    const l = [['Uraian', 'Satuan', 'Volume', 'Harga satuan', 'Jumlah'], ...rows.map(r => [r.a, r.u, r.q.toFixed(2), Math.round(r.p), Math.round(r.j)]), ['Subtotal', '', '', '', Math.round(sub)], ['Overhead & profit', '', '', '', Math.round(ov)], ['TOTAL', '', '', '', Math.round(RAB.tot)]];
    const csv = '\uFEFF' + l.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'rab-strutmix.csv' }).click();
  };

  // ----- SIMULASI: ubah satu parameter balok, lihat φMn dan biaya per meter -----
  const key = SIMP[$('param').value][0], lo = N('lo'), hi = N('hi'), steps = 24, res = [];
  for (let i = 0; i < steps; i++) {
    let v = lo + (hi - lo) * i / (steps - 1); if (key === 'n') v = Math.round(v);
    const q = { b, h, n: N('n'), fc }; q[key] = v;
    const r = beam(q.b, q.h, N('D'), q.n, q.fc), m = mixOf(q.fc, N('agg'));
    const cost = q.b * q.h / 1e6 * costM3(q.fc, m) + r.As * 1e-6 * 7850 * N('hBesi'); // Rp per meter balok
    res.push({ v, pMn: r.pMn, cost, ok: r.pMn >= Mu && r.As >= r.AsMin && r.et >= .004 });
  }
  const best = res.filter(r => r.ok).sort((a, c) => a.cost - c.cost)[0], mx = Math.max(...res.map(r => r.pMn), Mu), bw = 600 / steps;
  $('o-sim').innerHTML = `<h2>φMn vs ${$('param').value}</h2><svg viewBox="0 0 620 210" style="width:100%">` +
    res.map((r, i) => { const bh = r.pMn / mx * 170; return `<rect x="${10 + i * bw}" y="${180 - bh}" width="${bw - 3}" height="${bh}" rx="3" fill="${r.ok ? '#f08a3c' : '#d5d9d2'}" ${best && r === best ? 'stroke="#14171a" stroke-width="2"' : ''}><title>${f(r.v, 1)}: φMn ${f(r.pMn, 1)} kN·m, ${rp(r.cost)}/m</title></rect>`; }).join('') +
    `<line x1="10" x2="610" y1="${180 - Mu / mx * 170}" y2="${180 - Mu / mx * 170}" stroke="#d64545" stroke-dasharray="5 4"/><text x="12" y="${174 - Mu / mx * 170}" font-size="10" fill="#d64545">Mu = ${f(Mu, 0)} kN·m</text>
    <text x="10" y="200" font-size="10" fill="#7b827c">${f(lo, 0)}</text><text x="610" y="200" font-size="10" text-anchor="end" fill="#7b827c">${f(hi, 0)}</text></svg>
    <p>${best ? `Termurah yang memenuhi Mu: <b>${f(best.v, key === 'n' ? 0 : 1)}</b> dengan φMn ${f(best.pMn, 1)} kN·m, sekitar <b>${rp(best.cost)}/m</b> balok.` : 'Tidak ada nilai dalam rentang ini yang memenuhi Mu. Perbesar rentang atau ubah parameter lain.'}</p>
    <p class="note">Batang oranye memenuhi Mu, As,min, dan εt ≥ 0,004. Garis hitam menandai pilihan termurah. Biaya per meter hanya beton, tulangan tarik, dan upah beton.</p>`;

  // ----- Gauge -----
  $('gauges').innerHTML = gauge('Balok · Mu / φMn', rB) + gauge('Kolom · Pu / φPn', rK) + gauge('Tulangan kolom · ρg / 8%', rho / 8 * 100);
}

$('param').addEventListener('change', () => { const p = SIMP[$('param').value]; $('lo').value = p[1]; $('hi').value = p[2]; });
document.addEventListener('input', calc); document.addEventListener('change', calc);
calc();
