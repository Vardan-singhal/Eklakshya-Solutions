import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { CATALOGUES } from '../src/data/siteData.ts';
import { HOME_CATALOGUE } from '../src/data/homeCatalogue.ts';
import { buildCataloguePages, cataloguePageCount } from '../src/lib/cataloguePages.ts';

const manifest = JSON.parse(readFileSync(new URL('../src/data/catalogue-pages.json', import.meta.url), 'utf8'));
const publicFile = src => new URL('../public' + src, import.meta.url);

test('homepage illustration stays independent of the supplied PDF showcase', () => {
  const home = buildCataloguePages(HOME_CATALOGUE);
  assert.equal(HOME_CATALOGUE.id, 'home-studio-story');
  assert.equal(HOME_CATALOGUE.client, 'Eklakshya Solutions');
  assert.equal(home.length, 8);
  assert.equal(home[0].kind, 'cover');
  assert.equal(home.some(page => page.kind === 'document'), false);
  assert.equal(CATALOGUES.some(catalogue => catalogue.id === HOME_CATALOGUE.id), false);
  for (const catalogue of CATALOGUES) assert.equal(buildCataloguePages(catalogue)[0].kind, 'document');
  assert.deepEqual(home.map(page => page.kind), ['cover', 'intro', 'plate', 'plate', 'plate', 'plate', 'contact', 'end']);
  assert.deepEqual(home.filter(page => page.kind === 'plate').map(page => page.caption), ['Discover', 'Create', 'Optimise', 'Deliver']);
  for (const page of home.filter(page => page.kind === 'plate')) assert.ok(statSync(publicFile(page.image)).size > 1000);
  assert.equal(home[6].heading, HOME_CATALOGUE.story.invitationHeading);
  assert.equal(home[7].closingLine, HOME_CATALOGUE.story.closingLine);
});

test('both supplied PDFs have every original page asset in source order', () => {
  assert.deepEqual(CATALOGUES.map(c => c.id), ['sanway-2026', 'house-of-sutram']);
  for (const [index, source] of [manifest.sanway, manifest.houseOfSutram].entries()) {
    const catalogue = CATALOGUES[index];
    const expected = index === 0 ? 38 : 24;
    assert.equal(source.sourcePages, expected);
    assert.equal(catalogue.pages.length, expected);
    const original = readFileSync(publicFile(catalogue.pdf));
    assert.equal(original.subarray(0, 4).toString(), '%PDF');
    assert.equal(createHash('sha256').update(original).digest('hex'), source.sourceSha256);
    catalogue.pages.forEach((page, i) => {
      assert.match(page.src, new RegExp(`/page-${String(i + 1).padStart(2, '0')}\\.webp$`));
      assert.ok(statSync(publicFile(page.src)).size > 1000);
      assert.equal(readFileSync(publicFile(page.src)).subarray(8, 12).toString(), 'WEBP');
      assert.ok(page.width > 1000 && page.height >= 1491);
      assert.ok(page.alt.includes(`page ${i + 1}`));
    });
  }
});

test('PDF artwork replaces every dummy page and the Eklakshya back cover stays last', () => {
  for (const catalogue of CATALOGUES) {
    const pages = buildCataloguePages(catalogue);
    assert.equal(pages.length % 2, 0);
    assert.equal(pages.length, cataloguePageCount(catalogue));
    assert.deepEqual(pages.filter(page => page.kind === 'document').map(page => page.src), catalogue.pages.map(page => page.src));
    assert.equal(pages.some(page => ['cover', 'intro', 'plate', 'contact'].includes(page.kind)), false);
    assert.deepEqual(pages.at(-1), { kind: 'end', client: catalogue.client });
    assert.equal(pages.at(-2).kind, 'blank');
  }
});

test('odd-length PDFs and legacy catalogues retain paired leaves and branded closing', () => {
  const odd = { ...CATALOGUES[0], pages: CATALOGUES[0].pages.slice(0, 3) };
  assert.deepEqual(buildCataloguePages(odd).map(page => page.kind), ['document', 'document', 'document', 'end']);
  assert.equal(cataloguePageCount(odd), 4);
  const legacy = { ...CATALOGUES[0], pages: undefined, plates: [{ title: 'Product', sub: '', image: '/product.jpg', imageAlt: 'Product', sku: 1, specs: [] }] };
  assert.deepEqual(buildCataloguePages(legacy).map(page => page.kind), ['cover', 'intro', 'plate', 'contact', 'blank', 'end']);
  assert.equal(cataloguePageCount(legacy), 6);
});
