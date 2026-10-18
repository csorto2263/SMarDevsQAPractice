const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export const fmtMoney = n => money.format(Number(n) || 0);

function parts(s) {
  if (!s) return null;
  const [d, t = ''] = String(s).split(' ');
  const [y, m, day] = d.split('-');
  return { y, m, day, t: t.slice(0, 5) };
}

export function fmtDate(s) {
  const p = parts(s);
  return p ? `${p.day}/${p.m}/${p.y}` : '';
}

export function fmtDateTime(s) {
  const p = parts(s);
  return p ? `${p.day}/${p.m}/${p.y} ${p.t}` : '';
}

export function fmtDateUS(s) {
  const p = parts(s);
  return p ? `${p.m}/${p.day}/${p.y}` : '';
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function firstOfMonthISO() {
  return todayISO().slice(0, 8) + '01';
}
