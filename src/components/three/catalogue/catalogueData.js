// Product catalogue dataset for Eklakshya luxury catalogue generation

export const INITIAL_PRODUCTS = [
  {
    id: 'lum-801',
    sku: 'LUM-801',
    name: 'Aura Linear Suspension',
    category: 'Architectural Lighting',
    material: 'Brushed Brass · Opal Glass',
    finish: 'Satin Champagne Gold',
    size: 'L 1400 × W 65 × H 45 mm',
    price: '$780',
    stock: '142 units',
    leadTime: '3-5 days',
    graphicType: 'linear-pendant',
    highlight: 'Dimmable 2700K warm diffuse glow with 98+ CRI rating',
    specs: [
      ['Output', '4,200 lm @ 2700K'],
      ['CRI', 'Ra > 98 (R9 > 94)'],
      ['Optics', 'Triplex Matte Opal Tube'],
      ['Control', 'DALI-2 / 0-10V / Zigbee'],
      ['IP Rating', 'IP44 Indoor/Bath'],
      ['Voltage', '120-277V AC · 48W']
    ]
  },
  {
    id: 'lum-802',
    sku: 'LUM-802',
    name: 'Orbita Chandelier 900',
    category: 'Architectural Lighting',
    material: 'Precision Milled Brass · Hand-Blown Glass',
    finish: 'Natural Matte Brass',
    size: 'Ø 900 × H 750 mm',
    price: '$1,450',
    stock: '48 units',
    leadTime: '2 weeks',
    graphicType: 'chandelier',
    highlight: 'Double concentric rings with independent ambient & direct downlight',
    specs: [
      ['Output', '7,800 lm Total'],
      ['CRI', 'Ra > 97'],
      ['Color Temp', '2200K - 3000K Dim-to-Warm'],
      ['Mounting', 'Aircraft Cable 2.5m drop'],
      ['Weight', '8.4 kg'],
      ['Cert.', 'CE / UL Listed']
    ]
  },
  {
    id: 'lum-803',
    sku: 'LUM-803',
    name: 'Vektor Monopoint Spotlight',
    category: 'Architectural Lighting',
    material: 'Die-cast Aerospace Aluminum',
    finish: 'Anodized Matte Black',
    size: 'Ø 54 × L 130 mm',
    price: '$260',
    stock: '360 units',
    leadTime: 'Immediate',
    graphicType: 'spotlight',
    highlight: 'Tool-less magnetic interchangeable beam lenses (15°/24°/38°)',
    specs: [
      ['Beam Angle', '15° / 24° / 38° interchangeable'],
      ['Output', '1,650 lm · 18W'],
      ['Rotation', '360° Pan · 90° Tilt'],
      ['Glare Control', 'Honeycomb Louver included'],
      ['Cut-off', '45° visual comfort angle']
    ]
  },
  {
    id: 'lum-804',
    sku: 'LUM-804',
    name: 'Stria Fluted Wall Sconce',
    category: 'Architectural Lighting',
    material: 'Fluted Borosilicate Glass · Cast Bronze',
    finish: 'Aged Gunmetal Bronze',
    size: 'W 110 × D 85 × H 420 mm',
    price: '$420',
    stock: '85 units',
    leadTime: '4 days',
    graphicType: 'sconce',
    highlight: 'Dual-directional vertical graze highlighting textured masonry',
    specs: [
      ['Output', '2,100 lm (Bi-directional)'],
      ['IP Rating', 'IP65 Wet Location'],
      ['Glass', 'Heavy wall 4mm fluted'],
      ['Driver', 'Phase-cut Triac integrated']
    ]
  },
  {
    id: 'hdw-101',
    sku: 'HDW-101',
    name: 'Monolith Knurled Lever Set',
    category: 'Architectural Hardware',
    material: 'Solid Forged Brass Block',
    finish: 'Diamond Knurled Raw Brass',
    size: 'Rose Ø 55mm · Lever L 145mm',
    price: '$210',
    stock: '215 pairs',
    leadTime: 'Immediate',
    graphicType: 'lever',
    highlight: 'Triple-bearing spindle assembly tested to 500,000 cycles',
    specs: [
      ['Spindle', '8mm hardened steel with anti-rattle'],
      ['Mechanism', 'Spring-assisted heavy duty cassette'],
      ['Door Range', '35mm - 55mm thickness'],
      ['Fire Rating', 'FD30 / FD60 Certified']
    ]
  },
  {
    id: 'hdw-102',
    sku: 'HDW-102',
    name: 'Strata Flush Pull Handle 400',
    category: 'Architectural Hardware',
    material: 'Solid 6061-T6 Billet Aluminum',
    finish: 'Hard Anodized Charcoal',
    size: 'L 400 × W 45 × Depth 16 mm',
    price: '$175',
    stock: '180 units',
    leadTime: 'Immediate',
    graphicType: 'handle',
    highlight: 'Concealed screw fixings with integrated dust-seal gasket',
    specs: [
      ['Mortise Depth', '14.5mm precise fit'],
      ['Grip Pocket', 'Ergonomic 30° undercut'],
      ['Application', 'Pocket / Sliding / Pivot doors'],
      ['Fixing', 'Concealed rear M5 studs']
    ]
  },
  {
    id: 'hdw-103',
    sku: 'HDW-103',
    name: 'Titanium Magnetic Mortise Lock',
    category: 'Architectural Hardware',
    material: 'Stainless Steel & Neodymium',
    finish: 'PVD Brushed Titanium',
    size: 'Faceplate 240 × 20 mm · Backset 60mm',
    price: '$145',
    stock: '310 units',
    leadTime: 'Immediate',
    graphicType: 'lock',
    highlight: 'Silent magnetic latch extends only when door is fully closed',
    specs: [
      ['Silent Action', '< 22 dB acoustic rating'],
      ['Cycle Test', 'EN 12209 Grade 3 (200k cycles)'],
      ['Backset', '55mm / 60mm adjustable'],
      ['Hub', '8mm square follower']
    ]
  },
  {
    id: 'hdw-104',
    sku: 'HDW-104',
    name: 'Cylinder Cabinet Knob 32',
    category: 'Architectural Hardware',
    material: 'Solid Turned Brass',
    finish: 'Satin Nickel & Gold Dual Tone',
    size: 'Ø 32 mm × Projection 28 mm',
    price: '$45',
    stock: '540 units',
    leadTime: 'Immediate',
    graphicType: 'knob',
    highlight: 'Micro-ridged tactile perimeter with mirror-polished top face',
    specs: [
      ['Thread', 'M4 female standard'],
      ['Anti-spin', 'Includes twin locator pins'],
      ['Weight', '185 grams solid']
    ]
  },
  {
    id: 'mat-501',
    sku: 'MAT-501',
    name: 'Acoustic Wood Slat Panel',
    category: 'Acoustic Surfaces',
    material: 'FSC Certified White Oak on Recycled PET',
    finish: 'Natural Matte Polyurethane',
    size: '2400 × 600 × 22 mm',
    price: '$189 / m²',
    stock: '420 m²',
    leadTime: '1 week',
    graphicType: 'acoustic',
    highlight: 'NRC 0.85 acoustic absorption with real timber veneer warmth',
    specs: [
      ['Acoustic Class', 'Class A (NRC 0.85)'],
      ['Substrate', '9mm black recycled acoustic felt'],
      ['Slat Width', '27mm slats with 13mm spacing'],
      ['Fire Rating', 'EN 13501-1 Class B-s1, d0']
    ]
  },
  {
    id: 'mat-502',
    sku: 'MAT-502',
    name: 'Bespoke Liquid Bronze Tile',
    category: 'Acoustic Surfaces',
    material: 'Cold-Cast Real Bronze Resin',
    finish: 'Verdigris Hand-Patina',
    size: '300 × 300 × 8 mm',
    price: '$320 / m²',
    stock: '95 m²',
    leadTime: '3 weeks',
    graphicType: 'tile',
    highlight: 'Organic rippled topography reflecting directional accent lighting',
    specs: [
      ['Composition', '85% micronized bronze alloy'],
      ['Installation', 'Thin-set polymer adhesive'],
      ['Sealing', 'Microcrystalline protective wax']
    ]
  },
  {
    id: 'lum-805',
    sku: 'LUM-805',
    name: 'Halo Surface Disc 600',
    category: 'Architectural Lighting',
    material: 'Spun Aluminum · Frosted Acrylic',
    finish: 'Warm Alabaster White',
    size: 'Ø 600 × 38 mm',
    price: '$540',
    stock: '126 units',
    leadTime: '5 days',
    graphicType: 'disc',
    highlight: 'Ultra-slim surface disc with edge-lit halo and zero-glare diffuser',
    specs: [
      ['Output', '3,100 lm @ 3000K'],
      ['Profile', '38mm ultra-slim surface mount'],
      ['Diffuser', 'Opal PMMA edge-lit'],
      ['Control', 'Casambi Bluetooth / Phase-cut']
    ]
  },
  {
    id: 'hdw-105',
    sku: 'HDW-105',
    name: 'Axis Pivot Door Pull',
    category: 'Architectural Hardware',
    material: 'Solid Stainless · Bronze Sleeve',
    finish: 'Hand-Rubbed Oil Bronze',
    size: 'L 900 × Ø 32 mm',
    price: '$390',
    stock: '64 units',
    leadTime: '1 week',
    graphicType: 'pull',
    highlight: 'Continuous single-post pull engineered for oversized pivot doors',
    specs: [
      ['Mounting', 'Concealed M10 through-bolt'],
      ['Sleeve', 'Removable tactile bronze grip'],
      ['Door Weight', 'Rated to 320 kg pivot leaf'],
      ['Finish Warranty', '10 year living finish']
    ]
  }
];

export const CATALOGUE_CHAPTERS = [
  { id: 'ch1', title: '01 / ARCHITECTURAL LIGHTING', pages: '04 - 09', count: 4 },
  { id: 'ch2', title: '02 / PRECISION HARDWARE', pages: '10 - 15', count: 4 },
  { id: 'ch3', title: '03 / ACOUSTIC SURFACES', pages: '16 - 21', count: 2 },
  { id: 'ch4', title: '04 / TECHNICAL SPECIFICATIONS', pages: '22 - 28', count: 10 }
];

export const PREPRESS_METADATA = {
  jobId: 'EK-2026-CAT-0984',
  client: 'EKLAKSHYA LUXURY ARCHITECTURE',
  colorSpace: 'CMYK (ISO Coated v2 / FOGRA51)',
  resolution: '300 DPI @ 100% Scale',
  trimSize: '210 × 297 mm (A4 Vertical Spread)',
  bleedMargin: '3.0 mm Outer Bleed',
  safeMargin: '5.0 mm Inner Margin',
  screenRuling: '175 LPI Stochastic Hybrid',
  iccProfile: 'ISOcoated_v2_39l_eci.icc'
};
