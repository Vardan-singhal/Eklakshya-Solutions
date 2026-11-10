import assert from 'node:assert/strict';

const origin = process.env.AUDIT_ORIGIN || 'http://localhost:3100';
const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
assert.doesNotMatch(sitemap, /\/pricing/);
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
const results = [];
const links = new Set();
const forbidden = /\b(pricing|budget|packages?|fixed[- ]price|fixed quotes?|project quote|starting (?:at|from)|advance payment|service charges|view pricing|choose your plan|get a quote)\b/i;
for (const route of routes) {
  for (const device of ['desktop', 'mobile']) {
    const response = await fetch(`${origin}${route}`, { headers: { 'user-agent': device === 'mobile' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile' : 'Mozilla/5.0 desktop' } });
    assert.equal(response.status, 200, `${route} (${device})`);
    const html = await response.text();
    const text = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    assert.doesNotMatch(text, forbidden, `${route} (${device})`);
    assert.doesNotMatch(html, /href="\/pricing(?:[/?#"])/i);
    assert.doesNotMatch(html, /"(?:priceCurrency|AggregateOffer|Offer)"/);
    if (route === '/services') {
      for (const id of ['web-development', 'app-development', 'software-development', 'saas-product-development', 'catalogue-design', 'image-generation', 'seo']) assert.ok(html.includes(`id="${id}"`), id);
    }
    if (route === '/contact') assert.doesNotMatch(html, /(?:name|id)="budget"/);
    for (const [, raw] of html.matchAll(/href="(\/[^"<>]*)"/g)) links.add(raw.replaceAll('&amp;', '&'));
    results.push({ route, device, status: response.status });
  }
}
for (const link of links) {
  const response = await fetch(`${origin}${link}`, { redirect: 'manual' });
  assert.ok(response.status >= 200 && response.status < 400, `${link}: ${response.status}`);
  const hash = new URL(link, origin).hash.slice(1);
  if (hash && response.status === 200) assert.ok((await response.text()).includes(`id="${decodeURIComponent(hash)}"`), `Missing target ${link}`);
}
const redirect = await fetch(`${origin}/pricing`, { redirect: 'manual' });
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.get('location'), '/contact');
const checkout = await fetch(`${origin}/api/payments/create-order`, { method: 'POST' });
assert.equal(checkout.status, 410);
assert.equal(Object.hasOwn(await checkout.json(), 'amount'), false);
const report = { results, checkedInternalLinks: links.size, servicesVerified: 7, pricingRedirect: 308, retiredCheckout: 410 };
console.log(JSON.stringify(report, null, 2));
