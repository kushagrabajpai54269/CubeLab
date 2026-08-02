// Derives the 6 base (single clockwise quarter-turn) facelet permutations
// for a 3x3x3 cube from first-principles rotation geometry, rather than
// hand-transcribing a table. Verified in-script via structural and
// group-theoretic assertions. Run: node scripts/derive-move-tables.mjs
// Output is hand-copied into lib/cube/tables.ts as the engine's source of
// truth (kept here so it's re-derivable/auditable — see D-027).

const FACES = ['U', 'D', 'L', 'R', 'F', 'B']

// Outward face normal, in a right-handed system: x: L(-1)..R(+1), y: D(-1)..U(+1), z: B(-1)..F(+1)
const NORMAL = { U: [0,1,0], D: [0,-1,0], L: [-1,0,0], R: [1,0,0], F: [0,0,1], B: [0,0,-1] }

// Arbitrary-but-fixed in-plane axes per face (internal engine convention;
// doesn't need to match a human-readable net layout — Phase B maps its own
// visual layout onto these indices).
const ROW_DIR = { U:[0,0,1], D:[0,0,1], F:[0,-1,0], B:[0,-1,0], L:[0,-1,0], R:[0,-1,0] }
const COL_DIR = { U:[1,0,0], D:[1,0,0], F:[1,0,0], B:[1,0,0], L:[0,0,1], R:[0,0,1] }

function faceletGeometry(face, row, col) {
  const n = NORMAL[face], r = ROW_DIR[face], c = COL_DIR[face]
  const rr = row - 1, cc = col - 1
  return {
    pos: [n[0]+r[0]*rr+c[0]*cc, n[1]+r[1]*rr+c[1]*cc, n[2]+r[2]*rr+c[2]*cc],
    normal: n.slice(),
  }
}

const ALL = []
for (const face of FACES)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      ALL.push({ face, row, col, ...faceletGeometry(face, row, col) })

const key = (pos, normal) => `${pos.join(',')}|${normal.join(',')}`

// --- structural check 1: 54 unique (position, facing) identities ---
const seen = new Set()
for (const f of ALL) {
  const k = key(f.pos, f.normal)
  if (seen.has(k)) throw new Error(`Duplicate facelet identity at ${f.face}${f.row}${f.col}: ${k}`)
  seen.add(k)
}
if (ALL.length !== 54) throw new Error(`Expected 54 facelets, got ${ALL.length}`)

// --- structural check 2: correct piece-type multiplicity ---
const byPos = new Map()
for (const f of ALL) byPos.set(f.pos.join(','), (byPos.get(f.pos.join(',')) || 0) + 1)
let corners = 0, edges = 0, centers = 0
for (const [pk, count] of byPos) {
  const nonzero = pk.split(',').map(Number).filter((c) => c !== 0).length
  if (nonzero === 3) { if (count !== 3) throw new Error(`Corner ${pk}: ${count} facelets, expected 3`); corners++ }
  else if (nonzero === 2) { if (count !== 2) throw new Error(`Edge ${pk}: ${count} facelets, expected 2`); edges++ }
  else if (nonzero === 1) { if (count !== 1) throw new Error(`Center ${pk}: ${count} facelets, expected 1`); centers++ }
  else throw new Error(`Facelet(s) found at core position ${pk}`)
}
if (corners !== 8 || edges !== 12 || centers !== 6)
  throw new Error(`Wrong piece counts: corners=${corners} edges=${edges} centers=${centers}`)
console.log('✓ Structural check: 8 corners, 12 edges, 6 centers, 54 unique facelets.')

const lookup = new Map()
for (const f of ALL) lookup.set(key(f.pos, f.normal), { face: f.face, row: f.row, col: f.col })
function findIndex(pos, normal) {
  const found = lookup.get(key(pos, normal))
  if (!found) throw new Error(`No facelet at pos=${pos} normal=${normal}`)
  return found
}
const indexOf = (f) => FACES.indexOf(f.face) * 9 + f.row * 3 + f.col

// Rodrigues' rotation formula: rotate vector v by angle theta about unit axis k.
function rotate(v, k, theta) {
  const cos = Math.round(Math.cos(theta) * 1e6) / 1e6
  const sin = Math.round(Math.sin(theta) * 1e6) / 1e6
  const kv = k[0]*v[0] + k[1]*v[1] + k[2]*v[2]
  const cross = [k[1]*v[2]-k[2]*v[1], k[2]*v[0]-k[0]*v[2], k[0]*v[1]-k[1]*v[0]]
  return [0,1,2].map((i) => Math.round(v[i]*cos + cross[i]*sin + k[i]*kv*(1-cos)))
}

// A face move is defined as clockwise viewed from OUTSIDE that face — the
// universal, unambiguous cube-notation convention. By the right-hand rule
// (Rodrigues' formula), that is a NEGATIVE angle about the face's own
// outward normal — verified below against a known concrete fact, since
// group-order checks alone can't rule out an overall mirror-image bug.
const QUARTER = -Math.PI / 2

function derivePermutation(face) {
  const axis = NORMAL[face]
  const perm = Array.from({ length: 54 }, (_, i) => i)
  for (const f of ALL) {
    const onLayer = f.pos[0]*axis[0] + f.pos[1]*axis[1] + f.pos[2]*axis[2] === 1
    if (!onLayer) continue
    const dest = findIndex(rotate(f.pos, axis, QUARTER), rotate(f.normal, axis, QUARTER))
    perm[indexOf(dest)] = indexOf(f)
  }
  return perm
}

const basePerms = {}
for (const face of FACES) basePerms[face] = derivePermutation(face)

// --- group-theoretic check: every quarter turn has order 4 ---
function applyPerm(colors, perm) { return perm.map((src) => colors[src]) }
function composeN(perm, n) {
  let colors = Array.from({ length: 54 }, (_, i) => i)
  for (let i = 0; i < n; i++) colors = applyPerm(colors, perm)
  return colors
}
const identity = Array.from({ length: 54 }, (_, i) => i)
for (const face of FACES) {
  if (JSON.stringify(composeN(basePerms[face], 4)) !== JSON.stringify(identity))
    throw new Error(`Move ${face}: four quarter-turns did not return to identity!`)
}
console.log('✓ Order-4 check: every base move, applied 4 times, returns to identity.')

// --- locality check: a move never touches the opposite face ---
const OPPOSITE = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' }
for (const face of FACES) {
  const opp = OPPOSITE[face]
  for (let i = 0; i < 9; i++) {
    const idx = FACES.indexOf(opp) * 9 + i
    if (basePerms[face][idx] !== idx) throw new Error(`Move ${face} touches opposite face ${opp}!`)
  }
}
console.log('✓ Locality check: every move leaves the opposite face untouched.')

// --- chirality anchor: does "U" actually turn clockwise, not its mirror? ---
// Known fact, re-derived carefully by hand: a clockwise-from-above U move
// has content flow R->F->L->B->R (the classic "front-top row becomes what
// was the right-top row" fact taught in every beginner tutorial). So it's
// the URF corner's R-FACING sticker — not its F-facing sticker — that ends
// up on the F face.
{
  const urfR = ALL.find((f) => f.pos.join(',') === '1,1,1' && f.normal.join(',') === '1,0,0')
  const idx = indexOf(urfR)
  const destIdx = basePerms['U'].findIndex((src) => src === idx)
  const destFace = FACES[Math.floor(destIdx / 9)]
  console.log(`  U: URF's R-sticker → ${destFace} face (expected F, per R→F→L→B→R content flow)`)
  if (destFace !== 'F') throw new Error(`Chirality check FAILED — got ${destFace}, expected F`)
}
console.log('✓ Chirality anchor check passed.')

// Complementary check on the same fact: URF's F-facing sticker should
// land on L (since F's content flows to L in the same R->F->L->B->R cycle).
{
  const urfF = ALL.find((f) => f.pos.join(',') === '1,1,1' && f.normal.join(',') === '0,0,1')
  const idx = indexOf(urfF)
  const destIdx = basePerms['U'].findIndex((src) => src === idx)
  const destFace = FACES[Math.floor(destIdx / 9)]
  console.log(`  U: URF's F-sticker → ${destFace} face (expected L)`)
  if (destFace !== 'L') throw new Error(`Complementary chirality check FAILED — got ${destFace}, expected L`)
}
console.log('✓ Complementary chirality check passed.')

console.log('\nAll checks passed.\n')
console.log(JSON.stringify(basePerms))

// --- Phase A step 4 (Validator) addition: corner/edge facelet groupings ---
// Which flat facelet indices belong to each of the 8 corner slots and 12
// edge slots, derived from the same geometry already validated above.
//
// CRITICAL: the ORDER of each slot's 2-3 facelets must follow one single,
// fixed convention across every slot — cornerOrientation/edgeOrientation
// work by comparing a piece's current facelet tuple (read via its current
// slot's order) against rotations of its home slot's tuple (read via the
// home slot's own order); that comparison is only meaningful if "position
// 0/1/2" means the same axis role (X, then Y, then Z) at every slot. An
// earlier version sorted by raw flat facelet index instead, which is
// geometrically arbitrary (an accident of FACES array order) and produces
// a mismatched convention between slots — silently breaking corner/edge
// orientation for any piece that isn't already home (D-039).
function axisOf(normal) {
  if (normal[0] !== 0) return 0 // X: L/R
  if (normal[1] !== 0) return 1 // Y: U/D
  return 2 // Z: F/B
}

function cross(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
}
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }

function groupByPieceType() {
  const corners = [], edges = []
  for (const [pk] of byPos) {
    const coords = pk.split(',').map(Number)
    const nonzero = coords.filter((c) => c !== 0).length
    let members = ALL.filter((f) => f.pos.join(',') === pk)
      .slice()
      .sort((a, b) => axisOf(a.normal) - axisOf(b.normal))

    if (nonzero === 3) {
      // A fixed axis order (X,Y,Z) is only chirality-consistent for HALF
      // the corners: (n_x × n_y) · n_z equals px*py*pz, which is +1 for 4
      // corners and -1 for the other 4 (checkerboard parity) — an
      // unavoidable fact of 3 orthogonal axes, not a convention choice. So
      // a single fixed order is never enough; each corner's last two
      // entries must be swapped whenever its triple product is negative,
      // to make every corner's tuple right-handed (D-039 fix).
      const [n0, n1, n2] = members.map((m) => m.normal)
      if (dot(cross(n0, n1), n2) < 0) members = [members[0], members[2], members[1]]
    }

    const indices = members.map(indexOf)
    if (nonzero === 3) corners.push(indices)
    else if (nonzero === 2) edges.push(indices)
  }
  return { corners, edges }
}
const { corners: CORNER_FACELETS, edges: EDGE_FACELETS } = groupByPieceType()

if (CORNER_FACELETS.length !== 8 || CORNER_FACELETS.some((c) => c.length !== 3))
  throw new Error('CORNER_FACELETS shape check failed')
if (EDGE_FACELETS.length !== 12 || EDGE_FACELETS.some((e) => e.length !== 2))
  throw new Error('EDGE_FACELETS shape check failed')
console.log('✓ Piece grouping check: 8 corner slots (3 facelets each), 12 edge slots (2 facelets each).')

console.log('\nCORNER_FACELETS =', JSON.stringify(CORNER_FACELETS))
console.log('EDGE_FACELETS =', JSON.stringify(EDGE_FACELETS))
