"""Door handles. Proportions are measured from enlarged brochure photos and scaled to the
12 in (305 mm) size with a 16 mm bar; the brochure gives no drawings, so absolute sizes
are estimates. Letters follow the labels in each product's photo."""
from catalog3d import (bar_handle, turned_bar, lathe, ball, ridges, dense, handle_posts, box, soften, contours, cutter, pocket, on_face, wrapped,
                       sd_circle, sd_box, sd_segment, MM)
import math

CATEGORY = 'door-handles'

BLACK_GOLD = {'bar': 'black_matt', 'cap': 'gold_pvd'}
SATIN_CP = {'bar': 'satin', 'cap': 'chrome'}
ROSE_GOLD = {'bar': 'rose_gold_matt', 'cap': 'rose_gold_pvd'}
ANTIQUE = {'bar': 'antique', 'cap': 'antique_dark'}


def stepped_post(bar_r, stem, base, standoff, base_h, rounded=False):
    """A slim stem over a wider foot, as on the 1707-1710 posts. Depths run down from the bar axis."""
    top = bar_r + standoff - base_h
    shoulder = ([(top, stem), (top + 0.6, stem + (base - stem) * 0.45), (top + 1.4, base - (base - stem) * 0.18),
                 (top + 2.4, base - 0.15), (top + 3.4, base)] if rounded else
                [(top, stem), (top, base - 0.7), (top + 0.7, base)])
    floor = bar_r + standoff
    return [(0, 0), (0, stem), *shoulder, (floor - 0.4, base), (floor, base - 0.4), (floor, 0)]

# 1701: flat end rim, concave "bamboo" waist with a faint node line, two collars.
CAP_1701 = [(0, 0), (0, 7.4), (0.9, 8.2), (1.8, 8.3), (6.0, 8.3), (6.8, 7.8), (7.6, 7.6), (8.0, 7.7), (12, 7.2), (16, 6.9),
            (19.6, 6.8), (20, 6.95), (20.4, 6.8), (24, 7.0), (28, 7.5), (31, 8.2), (33, 8.9), (33.6, 9.3), (37.0, 9.3),
            (37.4, 8.7), (38.4, 8.7), (38.8, 9.3), (41.2, 9.3), (41.6, 8.0)]

# 1702: five saw-tooth rings widening toward the end, thin collar at the bar.
CAP_1702 = [(0, 0), (0, 7.6), (0.6, 8.7), (1.2, 9.0)] + ridges(1.2, 37.2, 5, 9.0, 7.2, shape='saw')[1:] + [
    (37.2, 8.2), (41.6, 8.2), (42.0, 8.0)]

# 1703: rounded bulb end, concave waist, a bead, then two thin collars.
CAP_1703 = [(0, 0), (0, 3.5), (0.5, 5.8), (1.5, 7.5), (3, 8.3), (5, 8.6), (8, 8.5), (11, 8.0), (15, 7.4), (19, 7.0),
            (23, 6.9), (26, 7.2), (28, 7.9), (29, 8.6), (30.5, 9.0), (32, 9.1), (33.5, 8.9), (35, 8.2), (35.4, 8.0),
            (36.8, 8.0), (37.2, 9.0), (39.5, 9.0), (39.9, 8.6), (40.3, 8.6), (40.7, 9.0), (42.6, 9.0), (43, 8.0)]

# 1704: pointed bullet finial, bead, ball, and a double collar.
CAP_1704 = [(0, 0), (1.0, 1.7), (3, 4.1), (6, 6.4), (9, 8.0), (12, 9.0), (15, 9.4), (17.5, 9.3), (19.5, 8.4),
            (20.5, 6.6), (21, 6.3), (21.6, 7.4), (22.6, 8.3), (23.6, 8.4), (24.6, 7.6), (25.2, 6.5), (25.8, 6.6),
            (27, 8.2), (28.5, 9.0), (30, 9.2), (31.5, 8.9), (32.6, 8.0), (33.2, 7.2), (33.8, 7.4), (34.6, 8.8),
            (35.6, 9.3), (36.6, 8.9), (37.2, 8.8), (38.0, 9.3), (39.2, 9.3), (40, 8.0)]

# 1705: plain end piece in the bar finish, five bands separated by four inlaid grooves.
CAP_1705 = [(0, 0, 'bar'), (0, 9.2, 'bar'), (0.8, 10, 'bar'), (12, 10, 'cap')]
for _band in range(5):
    _a = 12 + _band * 5.2
    CAP_1705 += [(_a + 3.6, 10, 'inlay'), (_a + 3.6, 8.7, 'inlay'), (_a + 5.2, 8.7, 'inlay'), (_a + 5.2, 10, 'cap')] if _band < 4 else [(_a + 3.6, 9.95, 'bar')]
CAP_1705.append((CAP_1705[-1][0] + 0.4, 10))

# 1706: ball finial on a ringed spindle, then a coiled sleeve wider than the bar.
CAP_1706 = (ball(6.2, 2.6, role='tip') + [(13.5, 2.7, 'tip'), (14, 3.5, 'tip')]
            + ridges(14, 22, 4, (4.6, 7.6), (3.8, 6.9), role='tip')[1:]
            + [(22, 7.8, 'cap'), (22.3, 11.4, 'cap'), (22.9, 12.0, 'cap')]
            + ridges(22.9, 58.5, 18, 12.0, 11.1)[1:] + [(58.9, 11.4), (59.3, 9.0)])

# 1707: long pointed spike, rounded shoulder, a grooved collar with one dark ring.
CAP_1707 = ([(0, 0), (0, 3.4), (0.6, 4.0), (10, 4.3), (18, 4.9), (24, 5.8), (30, 7.3), (35, 9.0), (39, 10.6), (42, 11.4),
             (44, 11.6), (45.5, 11.2), (46.5, 10.0), (47, 8.8), (48, 8.6), (48.6, 9.6), (49.2, 11.5), (50, 12.0), (53.5, 12.0)]
            + ridges(53.5, 58.5, 3, 12.0, 11.4)[1:] + [(58.8, 12.0, 'inlay'), (59.6, 12.0, 'inlay'), (60, 11.2), (60.4, 10)])

# 1708: domed end, seven bands tapering toward a double collar; grooves can be inlaid.
CAP_1708 = ([(0, 0), (0, 7.0), (0.6, 8.8), (1.6, 9.9), (3, 10.6), (5, 10.8), (8, 10.8)]
            + ridges(8, 39, 7, (10.8, 9.9), (10.1, 9.2), groove_role='inlay')[1:]
            + [(39, 9.4, 'inlay'), (39.4, 10.1), (41.4, 10.1, 'inlay'), (41.8, 9.6, 'inlay'), (42.2, 9.6, 'inlay'), (42.6, 10.1), (44.4, 10.1), (44.8, 9.0)])

# 1709: grooved egg on a slim neck, with a double-rimmed collar.
_EGG_1709 = [(0, 0), (0.3, 2.5), (1.2, 5.2), (2.5, 7.4), (4, 9.0), (6, 10.4), (8.5, 11.4), (11, 11.9), (13.5, 12.0), (16, 11.8),
             (19, 11.1), (22, 10.0), (25, 8.6), (28, 7.0), (31, 5.5), (33.5, 4.4), (35.5, 3.8), (37.5, 3.7)]


def _grooved(profile, xs, depth=0.45, width=0.7, role='inlay'):
    """Cuts V grooves into a profile at the given x positions."""
    def radius(x):
        for (x0, r0), (x1, r1) in zip(profile, profile[1:]):
            if x0 <= x <= x1:
                return r0 + (r1 - r0) * (x - x0) / (x1 - x0)
    out = [(x, r) for x, r in profile if not any(abs(x - g) < width for g in xs)]
    for g in xs:
        out += [(g - width / 2, radius(g - width / 2), role), (g, radius(g) - depth, role), (g + width / 2, radius(g + width / 2))]
    return sorted(out, key=lambda p: p[0])


CAP_1709 = _grooved(_EGG_1709, [4.5, 6.6, 8.7, 10.8, 12.9, 15.0]) + [
    (39, 4.0), (40, 5.5), (41, 8.5), (42, 10.2), (43, 10.6), (45, 10.6), (46, 10.0), (46.5, 10.0), (47.5, 10.6), (50, 10.6), (51, 9.6), (51.5, 8.5)]

# 1710: ball finial, slender neck with a bead, bell, five rings, plain collar.
CAP_1710 = (ball(5.7, 2.6) + [(13.5, 2.8), (18.5, 3.4), (19.2, 4.2), (20.3, 4.6), (21.4, 4.2), (22, 4.6), (23.5, 6.5),
                               (25.5, 8.3), (28, 9.2), (30.5, 9.3), (32.5, 9.0), (33, 8.2)]
            + ridges(33, 49, 5, 8.9, 8.0, groove_role='inlay')[1:] + [(49, 8.6), (53, 8.6), (53.4, 8.0)])

# The PVD range (1713-1735): polished PVD accents ("cap") on matt or brushed bars.
def pvd(cap, bar):
    return {'cap': cap, 'bar': bar}


GOLD_BLACK, ROSE_ROSE = pvd('gold_pvd', 'black_matt'), pvd('rose_gold_pvd', 'rose_gold_matt')
GOLD_ANTIQUE, ROSE_BLACK = pvd('gold_pvd', 'antique'), pvd('rose_gold_pvd', 'black_matt')
BLACK_BLACK, GOLD_GREEN = pvd('black_pvd', 'black_matt'), pvd('gold_pvd', 'green_matt')
GOLD_GOLD, ROSE_SATIN, CP_SATIN = pvd('gold_pvd', 'gold_matt'), pvd('rose_gold_pvd', 'satin'), pvd('chrome', 'satin')
GOLD_ROSE = pvd('gold_pvd', 'rose_gold_matt')
N_GOLD_BLACK, N_ROSE_ROSE, N_GOLD_ANTIQUE = 'Gold PVD & black matt', 'Rose gold PVD & rose gold matt', 'Gold PVD & antique'
N_ROSE_BLACK, N_BLACK_BLACK, N_GOLD_GREEN = 'Rose gold PVD & black matt', 'Black PVD & black matt', 'Gold PVD & green'
N_GOLD_GOLD, N_ROSE_SATIN, N_CP_SATIN = 'Gold PVD & gold matt', 'Rose gold PVD & satin', 'Chrome & satin'

# Flared post, narrow under the bar and widening to a banded foot (1719, 1720, 1728).
def flared_post(top, floor):
    span = floor - top
    return [(0, 0), (0, 4.0), (top + span * 0.25, 4.0), (top + span * 0.55, 4.4), (top + span * 0.8, 5.2), (floor - 2.2, 5.8),
            (floor - 1.8, 5.4), (floor - 1.4, 5.8), (floor - 0.3, 5.8), (floor, 5.5), (floor, 0)]


# 1719: thin bar; long finely ribbed sleeves at the ends, coned down to the bar. Posts sit under the sleeves.
CAP_1719 = ([(0, 0), (0, 7.8), (0.6, 8.8), (1.2, 9.0), (4, 9.0)] + ridges(4, 58, 24, 9.0, 8.5)[1:]
            + [(58, 9.0), (59, 9.0), (60, 8.6), (64, 7.0), (66, 6.25)])

# 1720: polished lip, a wider end tube, then a polished cone ring down to the thin bar.
CAP_1720 = [(0, 0), (0, 7.0), (0.4, 7.8), (2.5, 7.8), (3, 7.4, 'bar'), (47, 7.4), (52, 6.4), (52.3, 6.0)]

# 1722: one ribbed grip sleeve off-centre, near one post; thin polished discs at both ends.
PROFILE_1722 = ([(0, 0), (0, 5.4), (0.4, 6.0), (2.2, 6.0, 'bar'), (190, 6.0), (190.5, 6.6), (192, 7.2)]
                + ridges(192, 248, 16, 7.3, 6.7)[1:] + [(248, 7.2), (249.5, 6.6), (250, 6.0, 'bar'), (302.8, 6.0), (304.6, 6.0),
                                                       (305, 5.4), (305, 0)])

# 1725: polished stub and washer at the end, a plain end tube, and a polished ring between grooves.
CAP_1725 = [(0, 0), (0, 4.8), (0.5, 5.4), (8, 5.4), (8, 6.8), (9.2, 6.8), (9.2, 7.9, 'bar'), (9.6, 8.5, 'bar'), (40, 8.5, 'bar'),
            (40, 7.9), (40.6, 8.6), (44.4, 8.6), (45, 7.9, 'bar'), (45.6, 8.5)]

# 1727: lipped end tube, polished collar, coned shoulder, and four beads at the centre.
CAP_1727 = ([(0, 0), (0, 6.6), (0.4, 7.6), (2.4, 7.6), (2.8, 7.2, 'bar'), (40, 7.2), (40.3, 7.5), (43, 7.5), (43.3, 7.2, 'bar'),
             (58, 5.5, 'bar'), (134.5, 5.5)] + ridges(134.5, 152.5, 2, 7.6, 5.5)[1:])

# 1728: ribbed end, flanges either side of a straight-fluted collar that carries the post.
CAP_1728 = ([(0, 0), (0, 7.6), (0.6, 8.6), (2, 8.8)] + ridges(2, 30, 13, 8.8, 8.1)[1:]
            + [(30, 8.8), (31, 8.8), (31, 9.6), (34, 9.6), (34, 8.2)] + dense(35, 49, 9.0, 1.0, 'collar')
            + [(49, 8.2), (50, 8.2), (50, 9.6), (53, 9.6), (53, 7.5)])


def _flutes(x, a, r):
    return r + 0.32 * math.cos(48 * a) if 103.4 <= abs(x) <= 117.6 and r > 8.9 else r


# 1729: bamboo — a slim bar flaring toward a polished hourglass centre; conical posts.
CAP_1729 = [(0, 0), (0, 3.0, 'bar'), (0.5, 3.5, 'bar'), (30, 3.7, 'bar'), (60, 4.1, 'bar'), (85, 4.8, 'bar'), (105, 5.8, 'bar'),
            (118, 6.9, 'bar'), (124, 7.3), (124.3, 7.7), (125.5, 7.8), (126, 7.5), (130, 7.1), (136, 6.7), (142, 6.5), (148, 6.4),
            (152.5, 6.4)]
POST_1729 = [(0, 0), (0, 2.8), (6, 3.0), (12, 3.6), (18, 4.5), (22, 5.3), (24, 5.7), (24.4, 6.0), (26, 6.0), (26, 0)]

# 1730: ribbed end caps, bar tapering to a ribbed centre sleeve.
CAP_1730 = ([(0, 0), (0, 9.6), (0.8, 10.6), (1.4, 10.7)] + ridges(1.4, 36, 9, 10.7, 9.9)[1:]
            + [(36, 10.0), (36.4, 8.9), (38.4, 8.9), (38.4, 8.5, 'bar'), (110, 5.4, 'bar'), (117, 5.4), (117.5, 6.3), (118, 6.9)]
            + ridges(118, 152.5, 10, 6.9, 6.3)[1:])


def _smooth(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def knurl(x0, x1, r_band, count, pitch=1.2, depth=0.32):
    """Diamond knurl on bands x0 <= |x| <= x1 (centred mm) whose radius is r_band; count diamonds around."""
    def tri(t):
        return 1 - 2 * abs(t - math.floor(t) - 0.5)

    def modulate(x, a, r):
        if not (x0 <= abs(x) <= x1) or r < r_band - 1e-3:
            return r
        u = count * a / (2 * math.pi)
        return r - depth * (1 - min(tri(u + x / pitch), tri(u - x / pitch)))
    return modulate


def rope(limit, radius, starts=4, pitch=70.0, depth=0.55, width=0.14):
    """Crossing helical grooves over |x| < limit where the bar has the given radius: a twisted-rope look."""
    def groove(t):
        return max(0.0, 1 - abs(t - math.floor(t) - 0.5) / width)

    def modulate(x, a, r):
        if abs(x) > limit or abs(r - radius) > 1e-3:
            return r
        u = starts * a / (2 * math.pi)
        fade = _smooth((limit - abs(x)) / 3)
        # One dominant helix with a shallower, longer counter-helix reads as a twisted rope.
        return r - depth * fade * max(groove(u + x / pitch * starts), 0.55 * groove(u / 2 - x / (pitch * 2.2) * starts / 2))
    return modulate


def twist(limit, radius, lobes=3, turns=1.0, amount=0.14):
    """A rounded polygon section twisted along |x| < limit, blending to round at both ends."""
    def modulate(x, a, r):
        if abs(x) > limit or abs(r - radius) > 1e-3:
            return r
        fade = _smooth((limit - abs(x)) / 10)
        phase = lobes * (a - 2 * math.pi * turns * (x + limit) / (2 * limit) / lobes)
        return r * (1 + amount * fade * (math.cos(phase) - 0.35))
    return modulate


def combine(*mods):
    def modulate(x, a, r):
        for mod in mods:
            r = mod(x, a, r)
        return r
    return modulate


# 1718: plain bar with polished end discs and a diamond-knurled band over each post.
CAP_1718 = [(0, 0), (0, 6.8), (0.4, 8.2), (2.4, 8.2), (2.8, 8.0, 'bar'), (36.6, 8.0, 'bar'), (37, 8.4)] + dense(37, 55, 8.4, 0.15) + [
    (55.4, 8.0)]

# 1721: ribbed polished end, a wider plain end tube in the bar finish, a polished ring, then the slimmer bar.
CAP_1721 = ([(0, 0), (0, 6.9), (0.5, 7.7), (1.5, 7.8)] + ridges(1.5, 35, 14, 7.8, 7.2)[1:]
            + [(35, 7.8, 'bar'), (62, 7.8), (62.4, 8.1), (66.6, 8.1), (67, 7.8), (67.4, 5.4)])

# 1723: plain end tubes with polished discs; the middle has crossing helical grooves, joined at ring lines.
CAP_1723 = ([(0, 0), (0, 6.8), (0.4, 8.2), (2.4, 8.2), (2.8, 8.0, 'bar'), (55, 8.0, 'bar'), (55.4, 7.6, 'bar'), (55.8, 8.0, 'bar')]
            + dense(56, 152.5, 8.0, 0.6, 'bar'))

# 1724: polished end discs, round end tubes, and a twisted three-lobed middle.
CAP_1724 = ([(0, 0), (0, 6.8), (0.4, 8.2), (2.4, 8.2), (2.8, 8.0, 'bar'), (60, 8.0, 'bar'), (60.4, 7.6, 'bar'), (60.8, 8.0, 'bar')]
            + dense(61, 152.5, 8.0, 0.8, 'bar'))

# Urn finial shared by 1731 and 1733: ball tip, discs, urn, bead and double collar.
FINIAL_URN = (ball(5.5, 2.8) + [(11.5, 2.8), (12.5, 3.2), (12.8, 6.6), (13.4, 7.2), (15.2, 7.2), (15.6, 6.4), (16.2, 5.0), (16.6, 6.0),
                                (17.2, 6.4), (18.6, 6.4), (19.0, 5.2), (19.4, 3.6), (24.5, 3.6), (26.5, 4.6), (29, 6.6), (32, 8.6), (35.5, 9.9),
                                (39.5, 10.5), (43.5, 10.2), (47.5, 9.0), (51, 7.0), (53, 5.4), (54.5, 5.0), (55.5, 5.4), (56.5, 7.6), (58, 8.0),
                                (59.5, 7.6), (60.5, 6.4), (61, 6.6), (61.4, 9.4), (62, 10.0), (64.4, 10.0), (64.8, 9.0, 'inlay'),
                                (65.8, 9.0, 'inlay'), (66.2, 10.0), (68.6, 10.0), (69.2, 9.4), (69.6, 8.5)])

# 1731: urn finials; bar with crossing grooves in three segments split by ring lines.
CAP_1731 = FINIAL_URN + [(69.6, 8.5, 'bar'), (110, 8.5, 'bar'), (110.4, 8.1, 'bar'), (110.8, 8.5, 'bar')] + dense(111, 152.5, 8.5, 0.6, 'bar')

# 1733: urn finials on a twisted three-lobed bar.
CAP_1733 = FINIAL_URN + [(69.6, 8.5, 'bar'), (76, 8.5, 'bar')] + dense(76.5, 152.5, 8.5, 0.8, 'bar')

# 1732: spike finial, bell, neck, bead and discs, a flared cone into a finely ribbed collar.
CAP_1732 = ([(0, 0), (4, 1.4), (9, 3.0), (14, 4.2), (14.4, 5.0), (16.0, 5.0), (16.4, 4.6), (20, 5.8), (24, 7.4), (26.5, 8.6), (27.4, 8.6),
             (27.6, 6.0), (30, 4.4), (35, 3.8), (40, 4.2), (43, 5.0), (44, 6.0), (46, 6.6), (49, 6.4), (51, 5.4), (51.4, 6.2), (53.6, 6.2),
             (54, 4.6), (54.4, 6.2), (56.6, 6.2), (57, 4.2), (60, 4.2), (63, 6.0), (66, 7.8), (68.4, 9.0), (69, 8.6), (69.4, 8.2)]
            + ridges(69.4, 94, 12, 8.2, 7.6)[1:] + [(94, 8.2), (94, 8.8), (95.6, 8.8), (96, 6.5)])

# 1734: long olive finial, a thin saucer, bead, vase, round urn, double collar.
CAP_1734 = [(0, 0), (2, 2.4), (5, 4.6), (9, 6.8), (14, 8.6), (19, 9.4), (23, 9.3), (27, 8.0), (30, 6.0), (32, 4.6), (33.6, 4.4),
            (33.8, 10.6), (34.6, 11.0), (35.4, 10.6), (35.6, 4.5), (36.6, 4.6), (37.2, 6.0), (39.5, 6.6), (41.8, 6.0), (42.4, 4.7),
            (45, 4.8), (49, 5.6), (53, 6.6), (55, 7.6), (57, 9.4), (60, 10.8), (64, 11.5), (68, 11.3), (72, 10.2), (75.5, 8.4),
            (77, 7.6), (78, 8.6), (78.4, 9.5), (81, 9.5), (81.4, 8.8), (82, 8.8), (82.4, 9.5), (84.6, 9.5), (85, 6.5)]

# 1735: ball tip, double collar, urn, double collar (grooves can be inlaid), then the bar.
CAP_1735 = (ball(4.6, 2.6) + [(10.4, 2.6), (12.4, 3.2), (12.8, 8.0), (13.4, 8.6), (19, 8.6), (19.4, 7.4, 'inlay'), (21.2, 7.4, 'inlay'),
                               (21.6, 8.6), (27.4, 8.6), (28, 7.4), (28.4, 4.2), (32.6, 4.2), (34, 6.2), (37, 8.6), (41, 10.4), (45, 11.0),
                               (49, 10.6), (53, 9.2), (56.5, 7.2), (58.6, 6.0), (61.6, 6.0), (62, 9.8), (62.6, 10.6), (68.6, 10.6),
                               (69, 9.3, 'inlay'), (70.6, 9.3, 'inlay'), (71, 10.6), (76.4, 10.6), (77, 9.0)])


def rosette(u, v, cu, cv, radius, line):
    """Holes of a six-petal rosette (petals and the spaces around them), leaving lines of the given width."""
    q = [(cu + radius * math.cos(math.pi / 2 + k * math.pi / 3), cv + radius * math.sin(math.pi / 2 + k * math.pi / 3)) for k in range(6)]
    petals = min(max(sd_circle(u, v, *q[(k - 1) % 6], radius), sd_circle(u, v, *q[(k + 1) % 6], radius)) for k in range(6))
    outer = sd_circle(u, v, cu, cv, radius)
    return min(petals, max(outer, -petals)) + line / 2


def square_handle(half, top, side, band, length=305, centres=245, plate=3.0, standoff=26, post_profile=None, depth=1.2):
    """Square bar with polished end plates. top(u, v) and side(u, v) are hole fields for one end band
    (u inward from the plate, v across the face) on the top/bottom and front/back faces; both ends match."""
    body = box('Bar', -length / 2 + plate, length / 2 - plate, half, half)
    for field, faces in ((top, (('z', 1), ('z', -1))), (side, (('y', 1), ('y', -1)))):
        loops = contours(field, -0.5, band + 0.5, -half - 0.5, half + 0.5)
        for sign in (-1, 1):
            start = sign * (length / 2 - plate)
            ends = [[(start - sign * u, v) for u, v in loop] for loop in loops]
            for axis, face in faces:
                pocket(body, cutter('Pattern', ends, on_face(axis, face, half, depth)), 'core')
    plates = [box(f'Plate {sign}', sign * (length / 2 - plate), sign * length / 2, half, half, 'cap') for sign in (-1, 1)]
    return [soften(body, 0.15), *[soften(p, 0.4) for p in plates],
            *handle_posts(centres, half, standoff, post_profile=post_profile, hole=4)]


def round_patterns(bar, bands, depth=1.0):
    """Pockets hole fields into a turned bar. bands lists (x0, x1, radius, field, wall_role, floor_role) in centred mm;
    field(u, v) takes u from x0 and v as arc length from the top, and should be periodic across the bottom seam."""
    for x0, x1, radius, field, wall_role, floor_role in bands:
        half_c = math.pi * radius
        loops = contours(field, -0.5, (x1 - x0) + 0.5, -half_c, half_c)
        loops = [[(x0 + u, v) for u, v in loop] for loop in loops]
        pocket(bar, cutter('Pattern', loops, wrapped(radius - depth, radius)), floor_role, wall_role)
    return bar


def _rosettes_1715(u, v):
    return min(rosette(u, v, 6.4 + i * 12.6, 0.0, 6.2, 0.5) for i in range(4))


def _chevrons_1716(u, v):
    """Five chevrons pointing at the end, each two slots that stop short of the centre line."""
    return min(min(sd_segment(u, v, 3.5 + i * 5.2, 0.9 * s, 8.0 + i * 5.2, 5.6 * s, 0.6) for s in (-1, 1)) for i in range(5))


def _slants_1716(u, v):
    return min(sd_segment(u, v, 3.5 + i * 5.2, -5.6, 8.0 + i * 5.2, 5.6, 0.6) for i in range(5))


def _astroid(u, v, cu, cv, a):
    du, dv = abs(u - cu), abs(v - cv)
    return (du ** (2 / 3) + dv ** (2 / 3)) ** 1.5 - a


def _stars_1713(radius):
    c = 2 * math.pi * radius

    def field(u, v):
        holes = []
        for i in range(4):
            for k in range(5):
                cu, cv = 6.0 + i * 9.0, -c / 2 + (k + 0.5) * c / 5
                # Four concave triangles round a centre, split by a thin cross: a four-pointed star.
                for su in (-1, 1):
                    for sv in (-1, 1):
                        qu, qv = cu + su * 2.1, cv + sv * 2.1
                        quadrant = sd_box(u, v, qu, qv, 1.8, 1.8)
                        bite = sd_circle(u, v, cu + su * 4.6, cv + sv * 4.6, 3.7)
                        holes.append(max(quadrant, -bite))
                if i < 3 and k < 4:
                    holes.append(sd_circle(u, v, cu + 4.5, cv + c / 10, 0.5))
        return min(holes)
    return field


def _slots_1714(radius):
    c = 2 * math.pi * radius

    def field(u, v):
        holes = []
        for i in range(6):
            for k in range(6):
                shift = 0.5 if i % 2 else 0.0
                cv = -c / 2 + (k + 0.5 + shift) * c / 6
                if cv > c / 2 - 2.0:
                    continue
                holes.append(sd_box(u, v, 3.0 + i * 4.4, cv, 1.25, 2.6, angle=0.45 if i % 2 else -0.45, round_=0.3))
        return min(holes)
    return field


def _lattice_1711(radius, length):
    """Open lattice: rounded square windows on a grid, with small diamond windows between them."""
    c = 2 * math.pi * radius
    around = 6
    pitch = c / around
    count = int((length - 8) / pitch)

    def field(u, v):
        if u < 4 or u > 4 + count * pitch:
            return 1.0
        holes = []
        for i in range(count):
            for k in range(around):
                cu, cv = 4 + (i + 0.5) * pitch, -c / 2 + (k + 0.5) * pitch
                holes.append(sd_box(u, v, cu, cv, pitch * 0.31, pitch * 0.31, round_=pitch * 0.12))
                if i < count - 1:
                    holes.append(sd_box(u, v, cu + pitch / 2, cv + pitch / 2 if k < around - 1 else cv - pitch / 2,
                                        pitch * 0.11, pitch * 0.11, angle=math.pi / 4))
        return min(holes)
    return field


def scoop(length, radius, depth):
    """A flat-bottomed scoop along the top, deepest at the centre, as on 1726; returns (modulate, recolour)."""
    def cut(x, a):
        d = radius - depth * max(0.0, 1 - (x / (length / 2)) ** 2)
        c = math.cos(a - math.pi / 2)
        return d / c if c > 1e-3 else None

    def modulate(x, a, r):
        if abs(x) >= length / 2 or abs(r - radius) > 1e-3:
            return r
        limit = cut(x, a)
        return min(r, limit) if limit else r

    def recolour(x, a, role):
        if role == 'bar' and abs(x) < length / 2:
            limit = cut(x, a)
            if limit and limit < radius - 0.02:
                return 'cap'
        return role
    return modulate, recolour


PRODUCTS = {
    'door-handles-1701': dict(
        build=lambda: bar_handle(CAP_1701, post_r=5.5, standoff=30),
        variants=[('A · Black & gold', BLACK_GOLD), ('B · Satin & chrome', SATIN_CP),
                  ('C · Rose gold', ROSE_GOLD), ('D · Antique', ANTIQUE)]),
    'door-handles-1702': dict(
        build=lambda: bar_handle(CAP_1702, post_r=5.5, standoff=30),
        variants=[('A · Rose gold', ROSE_GOLD), ('B · Satin & chrome', SATIN_CP),
                  ('C · Black & gold', BLACK_GOLD), ('D · Antique', ANTIQUE)]),
    'door-handles-1703': dict(
        build=lambda: bar_handle(CAP_1703, post_r=5.5, standoff=30),
        variants=[('A · Black & gold', BLACK_GOLD), ('B · Rose gold', ROSE_GOLD),
                  ('C · Satin & chrome', SATIN_CP), ('D · Antique', ANTIQUE)]),
    'door-handles-1704': dict(
        build=lambda: bar_handle(CAP_1704, post_r=5.5, standoff=30),
        variants=[('A · Antique', ANTIQUE), ('B · Rose gold', ROSE_GOLD),
                  ('C · Black & gold', BLACK_GOLD), ('D · Satin & chrome', SATIN_CP)]),
    'door-handles-1705': dict(
        build=lambda: bar_handle(CAP_1705, bar_r=10, post_r=6.5, standoff=30),
        variants=[('A · Antique', {'bar': 'antique', 'cap': 'antique', 'inlay': 'black_matt'}),
                  ('B · Satin & chrome', {'bar': 'satin', 'cap': 'chrome', 'inlay': 'satin'}),
                  ('C · Black & rose gold', {'bar': 'black_matt', 'cap': 'rose_gold_pvd', 'inlay': 'black_matt'}),
                  ('D · Black & gold', {'bar': 'black_matt', 'cap': 'gold_pvd', 'inlay': 'black_matt'})]),
    'door-handles-1706': dict(
        build=lambda: bar_handle(CAP_1706, bar_r=9, post_r=6, standoff=30),
        variants=[('A · Black & gold', {**BLACK_GOLD, 'tip': 'gold_pvd'}),
                  ('B · Antique', {'bar': 'antique', 'cap': 'antique_dark', 'tip': 'antique'}),
                  ('C · Rose gold', {**ROSE_GOLD, 'tip': 'rose_gold_pvd'}),
                  ('D · Satin & chrome', {**SATIN_CP, 'tip': 'chrome'})]),
    'door-handles-1707': dict(
        build=lambda: bar_handle(CAP_1707, bar_r=10, post_profile=stepped_post(10, 5, 9.6, 22, 12, rounded=True), hole=5),
        variants=[('A · Black & gold', {**BLACK_GOLD, 'inlay': 'gold_pvd'}), ('B · Rose gold', {**ROSE_GOLD, 'inlay': 'rose_gold_pvd'}),
                  ('C · Satin & chrome', {**SATIN_CP, 'inlay': 'chrome'}), ('D · Antique', {**ANTIQUE, 'inlay': 'black_matt'})]),
    'door-handles-1708': dict(
        build=lambda: bar_handle(CAP_1708, bar_r=9, post_profile=stepped_post(9, 4.8, 7.9, 16, 9), hole=4.5),
        variants=[('A · Rose gold', {**ROSE_GOLD, 'inlay': 'rose_gold_pvd'}), ('B · Black & gold', {**BLACK_GOLD, 'inlay': 'gold_pvd'}),
                  ('C · Antique', {**ANTIQUE, 'inlay': 'black_matt'}), ('D · Satin & chrome', {**SATIN_CP, 'inlay': 'chrome'})]),
    'door-handles-1709': dict(
        build=lambda: bar_handle(CAP_1709, bar_r=8.5, post_profile=stepped_post(8.5, 4.4, 7.4, 16, 9), hole=4.5),
        variants=[('A · Satin & chrome', {**SATIN_CP, 'inlay': 'chrome'}), ('B · Rose gold', {**ROSE_GOLD, 'inlay': 'rose_gold_pvd'}),
                  ('C · Black & gold', {**BLACK_GOLD, 'inlay': 'gold_pvd'}), ('D · Antique', {**ANTIQUE, 'inlay': 'antique_dark'})]),
    'door-handles-1710': dict(
        build=lambda: bar_handle(CAP_1710, post_profile=stepped_post(8, 4.4, 7.2, 16, 9), hole=4.5),
        variants=[('A · Satin & chrome', {**SATIN_CP, 'inlay': 'chrome'}), ('B · Black & gold', {**BLACK_GOLD, 'inlay': 'gold_pvd'}),
                  ('C · Antique', {**ANTIQUE, 'inlay': 'black_matt'}), ('D · Rose gold', {**ROSE_GOLD, 'inlay': 'rose_gold_pvd'})]),
    'door-handles-1719': dict(
        build=lambda: bar_handle(CAP_1719, centres=235, bar_r=9, post_role='cap', post_profile=flared_post(9, 29), hole=4),
        variants=[('A · ' + N_GOLD_BLACK, GOLD_BLACK), ('B · ' + N_ROSE_ROSE, ROSE_ROSE), ('C · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE),
                  ('D · ' + N_ROSE_BLACK, ROSE_BLACK), ('E · ' + N_GOLD_BLACK, GOLD_BLACK)]),
    'door-handles-1720': dict(
        build=lambda: bar_handle(CAP_1720, centres=245, bar_r=7.4, post_profile=flared_post(7.4, 27), hole=4),
        variants=[('A · ' + N_BLACK_BLACK, BLACK_BLACK), ('B · ' + N_ROSE_ROSE, ROSE_ROSE),
                  ('C · ' + N_GOLD_BLACK, GOLD_BLACK), ('D · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE)]),
    'door-handles-1722': dict(
        build=lambda: bar_handle(PROFILE_1722, full=True, centres=235, bar_r=6, post_r=4, standoff=25),
        variants=[('A · ' + N_GOLD_BLACK, GOLD_BLACK), ('B · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('C · ' + N_ROSE_BLACK, ROSE_BLACK),
                  ('D · ' + N_BLACK_BLACK, BLACK_BLACK), ('E · ' + N_GOLD_GOLD, GOLD_GOLD), ('F · ' + N_ROSE_ROSE, ROSE_ROSE)]),
    'door-handles-1725': dict(
        build=lambda: bar_handle(CAP_1725, centres=195, bar_r=8.5, post_profile=stepped_post(8.5, 5.0, 6.8, 24, 10), hole=5),
        variants=[('A · ' + N_BLACK_BLACK, BLACK_BLACK), ('B · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('C · ' + N_ROSE_SATIN, ROSE_SATIN),
                  ('D · ' + N_GOLD_GREEN, GOLD_GREEN), ('E · ' + N_ROSE_ROSE, ROSE_ROSE)]),
    'door-handles-1727': dict(
        build=lambda: bar_handle(CAP_1727, centres=255, bar_r=7.2, post_profile=stepped_post(7.2, 4.4, 6.0, 22, 9), hole=4.5),
        variants=[('A · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('B · ' + N_ROSE_ROSE, ROSE_ROSE),
                  ('C · ' + N_BLACK_BLACK, BLACK_BLACK), ('D · ' + N_GOLD_BLACK, GOLD_BLACK)]),
    'door-handles-1728': dict(
        build=lambda: bar_handle(CAP_1728, centres=221, bar_r=9.0, post_role='cap', post_profile=flared_post(9.0, 29), hole=4,
                                 segments=288, modulate=_flutes),
        variants=[('A · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'collar': 'gold_pvd'}), ('B · ' + N_ROSE_BLACK, {**ROSE_BLACK, 'collar': 'rose_gold_pvd'}),
                  ('C · Antique', {'cap': 'antique', 'bar': 'antique', 'collar': 'antique'}), ('D · ' + N_GOLD_GREEN, {**GOLD_GREEN, 'collar': 'gold_pvd'})]),
    'door-handles-1729': dict(
        build=lambda: bar_handle(CAP_1729, centres=250, bar_r=4.0, post_profile=POST_1729, hole=None),
        variants=[('A · Gold PVD & rose gold matt', GOLD_ROSE), ('B · ' + N_GOLD_GREEN, GOLD_GREEN), ('C · ' + N_ROSE_ROSE, ROSE_ROSE),
                  ('D · ' + N_GOLD_BLACK, GOLD_BLACK), ('E · ' + N_ROSE_BLACK, ROSE_BLACK), ('F · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE)]),
    'door-handles-1730': dict(
        build=lambda: bar_handle(CAP_1730, centres=215, bar_r=8.5, post_r=5, standoff=24),
        variants=[('A · ' + N_GOLD_GOLD, GOLD_GOLD), ('B · ' + N_BLACK_BLACK, BLACK_BLACK), ('C · ' + N_GOLD_BLACK, GOLD_BLACK),
                  ('D · ' + N_ROSE_BLACK, ROSE_BLACK), ('E · ' + N_ROSE_ROSE, ROSE_ROSE)]),
    'door-handles-1718': dict(
        build=lambda: bar_handle(CAP_1718, centres=215, bar_r=8, post_role='cap', post_profile=flared_post(8, 30), hole=4,
                                 segments=352, bevel=0, modulate=knurl(97.5, 115.5, 8.4, 44)),
        variants=[('A · ' + N_GOLD_BLACK, GOLD_BLACK), ('B · ' + N_GOLD_GREEN, GOLD_GREEN), ('C · ' + N_ROSE_ROSE, ROSE_ROSE),
                  ('D · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('E · ' + N_ROSE_BLACK, ROSE_BLACK)]),
    'door-handles-1721': dict(
        build=lambda: bar_handle(CAP_1721, centres=209, bar_r=7.8, post_profile=flared_post(7.8, 28), hole=4),
        variants=[('A · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('B · ' + N_ROSE_ROSE, ROSE_ROSE), (N_BLACK_BLACK, BLACK_BLACK),
                  ('C · ' + N_GOLD_GREEN, GOLD_GREEN), ('D · ' + N_GOLD_BLACK, GOLD_BLACK)]),
    'door-handles-1723': dict(
        build=lambda: bar_handle(CAP_1723, centres=230, bar_r=8, post_profile=flared_post(8, 30), hole=4, segments=192,
                                 modulate=rope(96.5, 8.0)),
        variants=[('A · ' + N_BLACK_BLACK, BLACK_BLACK), ('B · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE),
                  ('C · ' + N_ROSE_ROSE, ROSE_ROSE), ('D · ' + N_GOLD_BLACK, GOLD_BLACK)]),
    'door-handles-1724': dict(
        build=lambda: bar_handle(CAP_1724, centres=230, bar_r=8, post_profile=flared_post(8, 30), hole=4, segments=192,
                                 modulate=twist(91.5, 8.0, lobes=3, turns=1.0, amount=0.2)),
        variants=[('A · ' + N_GOLD_BLACK, GOLD_BLACK), ('B · ' + N_ROSE_ROSE, ROSE_ROSE)]),
    'door-handles-1731': dict(
        build=lambda: bar_handle(CAP_1731, centres=150, bar_r=8.5, post_profile=stepped_post(8.5, 5.0, 6.4, 22, 5), hole=None,
                                 segments=192, modulate=rope(83, 8.5)),
        variants=[('A · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'inlay': 'gold_pvd'}), ('B · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'inlay': 'rose_gold_pvd'}),
                  ('C · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'inlay': 'gold_pvd'}), ('D · ' + N_BLACK_BLACK, {**BLACK_BLACK, 'inlay': 'black_pvd'})]),
    'door-handles-1732': dict(
        build=lambda: bar_handle(CAP_1732, centres=225, bar_r=8.2, post_profile=flared_post(8.2, 28), hole=4),
        variants=[('A · ' + N_BLACK_BLACK, BLACK_BLACK), ('B · ' + N_ROSE_ROSE, ROSE_ROSE),
                  ('C · Antique', {'cap': 'antique', 'bar': 'antique'}), ('D · ' + N_ROSE_BLACK, ROSE_BLACK)]),
    'door-handles-1733': dict(
        build=lambda: bar_handle(CAP_1733, centres=150, bar_r=8.5, post_profile=stepped_post(8.5, 5.0, 6.4, 22, 5), hole=None,
                                 segments=192, modulate=twist(76.0, 8.5, lobes=3, turns=1.0, amount=0.2)),
        variants=[('A · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'inlay': 'rose_gold_pvd'}), ('B · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'inlay': 'gold_pvd'}),
                  ('C · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'inlay': 'gold_pvd'}), ('D · ' + N_BLACK_BLACK, {**BLACK_BLACK, 'inlay': 'black_pvd'})]),
    'door-handles-1734': dict(
        build=lambda: bar_handle(CAP_1734, centres=150, bar_r=6.5, post_r=4.5, standoff=26),
        variants=[('A · ' + N_CP_SATIN, CP_SATIN), ('B · ' + N_GOLD_BLACK, GOLD_BLACK), ('C · Antique', {'cap': 'antique', 'bar': 'antique'}),
                  ('D · ' + N_ROSE_ROSE, ROSE_ROSE), ('E · ' + N_GOLD_GOLD, GOLD_GOLD)]),
    'door-handles-1735': dict(
        build=lambda: bar_handle(CAP_1735, centres=150, bar_r=9, post_profile=stepped_post(9, 5.4, 6.8, 22, 6), hole=3),
        variants=[('A · ' + N_CP_SATIN, {**CP_SATIN, 'inlay': 'chrome'}), ('B · Antique', {'cap': 'antique_dark', 'bar': 'antique', 'inlay': 'black_matt'}),
                  ('C · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'inlay': 'rose_gold_pvd'}), ('D · ' + N_GOLD_GOLD, {**GOLD_GOLD, 'inlay': 'gold_pvd'}),
                  ('E · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'inlay': 'gold_pvd'})]),
    'door-handles-1715': dict(
        build=lambda: square_handle(7.0, _rosettes_1715, _rosettes_1715, 52, post_profile=flared_post(7.0, 31)),
        variants=[('A · Gold PVD & black matt', {**GOLD_BLACK, 'core': 'gold_pvd'}), ('B · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'core': 'rose_gold_pvd'}),
                  ('C · ' + N_ROSE_BLACK, {**ROSE_BLACK, 'core': 'rose_gold_pvd'}), ('D · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'core': 'gold_pvd'}),
                  ('E · Gold PVD & rose gold matt', {**GOLD_ROSE, 'core': 'gold_pvd'})]),
    'door-handles-1716': dict(
        build=lambda: square_handle(7.2, _chevrons_1716, _slants_1716, 32, post_profile=flared_post(7.2, 31), depth=0.6),
        variants=[('A · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'core': 'rose_gold_pvd'}), ('B · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'core': 'gold_pvd'}),
                  ('C · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'core': 'gold_pvd'}), ('D · Gold PVD & rose gold matt', {**GOLD_ROSE, 'core': 'gold_pvd'}),
                  ('E · ' + N_ROSE_BLACK, {**ROSE_BLACK, 'core': 'rose_gold_pvd'})]),
    'door-handles-1713': dict(
        build=lambda: _patterned(7.8, lambda: [(-149.0, -105.0, 7.8, _stars_1713(7.8), 'bar', 'core'),
                                              (105.0, 149.0, 7.8, _mirror(_stars_1713(7.8), 44.0), 'bar', 'core')]),
        variants=[('A · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'core': 'gold_pvd'}), ('B · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'core': 'gold_pvd'}),
                  ('C · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'core': 'gold_pvd'}), ('D · ' + N_ROSE_BLACK, {**ROSE_BLACK, 'core': 'rose_gold_pvd'}),
                  ('E · Gold PVD & rose gold matt', {**GOLD_ROSE, 'core': 'gold_pvd'})]),
    'door-handles-1714': dict(
        build=lambda: _patterned(7.8, lambda: [(-149.0, -119.0, 7.8, _slots_1714(7.8), 'bar', 'core'),
                                              (119.0, 149.0, 7.8, _mirror(_slots_1714(7.8), 30.0), 'bar', 'core')]),
        variants=[('A · Gold PVD & rose gold matt', {**GOLD_ROSE, 'core': 'gold_pvd'}), ('B · ' + N_ROSE_BLACK, {**ROSE_BLACK, 'core': 'rose_gold_pvd'}),
                  ('C · ' + N_GOLD_ANTIQUE, {**GOLD_ANTIQUE, 'core': 'gold_pvd'}), ('D · ' + N_ROSE_ROSE, {**ROSE_ROSE, 'core': 'rose_gold_pvd'}),
                  ('E · ' + N_GOLD_BLACK, {**GOLD_BLACK, 'core': 'gold_pvd'})]),
    'door-handles-1711': dict(
        build=lambda: _patterned(6.4, lambda: [(-54.0, 54.0, 6.4, _lattice_1711(6.4, 108.0), 'sleeve', 'core')],
                                 recolour=lambda x, a, role: 'sleeve' if abs(x) < 54.0 and role == 'bar' else role, cap_role='bar'),
        variants=[('A · Black & gold', {'bar': 'gold_pvd', 'sleeve': 'black_matt', 'core': 'gold_pvd'}),
                  ('B · Gold & black', {'bar': 'black_matt', 'sleeve': 'gold_pvd', 'core': 'chrome'}),
                  ('C · Gold & rose gold', {'bar': 'rose_gold_pvd', 'sleeve': 'gold_pvd', 'core': 'chrome'})]),
    'door-handles-1726': dict(
        build=lambda: bar_handle(CAP_1726, centres=230, bar_r=8, post_profile=flared_post(8, 30), hole=4, segments=256,
                                 modulate=scoop(130, 8.0, 3.2)[0], recolour=scoop(130, 8.0, 3.2)[1]),
        variants=[('A · ' + N_ROSE_ROSE, ROSE_ROSE), ('B · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE),
                  ('C · ' + N_GOLD_GREEN, GOLD_GREEN), ('D · ' + N_GOLD_BLACK, GOLD_BLACK)]),
}


def _mirror(field, band):
    """The same band pattern seen from the other end of the bar."""
    return lambda u, v: field(band - u, v)


def _patterned(radius, bands, recolour=None, cap_role='cap'):
    """Plain round bar with polished end discs and pocketed patterns (1711, 1713, 1714)."""
    profile = [(0, 0, cap_role), (0, radius - 1.2, cap_role), (0.4, radius, cap_role), (3.0, radius, 'bar')] + dense(3.4, 152.5, radius, 1.5, 'bar')
    bar = turned_bar(profile, 305, segments=192, recolour=recolour)
    round_patterns(bar, bands())
    return [soften(bar, 0.12), *handle_posts(235, radius, 24, post_profile=flared_post(radius, radius + 24), hole=4)]


CAP_1726 = [(0, 0), (0, 6.8), (0.4, 8.2), (2.4, 8.2), (2.8, 8.0, 'bar')] + dense(3.0, 152.5, 8.0, 0.8, 'bar')


def block_post(name, x, half_x, half_y, top, bottom, role='bar', hole=5.0):
    """Square post from top down to bottom (mm, z), with a screw hole in the -Y face."""
    import bpy
    post = box(name, x - half_x, x + half_x, half_y, (top - bottom) / 2, role, z=(top + bottom) / 2)
    if hole:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.4 * MM, depth=half_y * 2 * MM,
                                            location=(x * MM, -half_y * MM, (bottom + hole) * MM), rotation=(math.pi / 2, 0, 0))
        drill = bpy.context.object
        mod = post.modifiers.new('Hole', 'BOOLEAN')
        mod.object, mod.solver = drill, 'EXACT'
        bpy.context.view_layer.objects.active = post
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(drill)
        for slot in post.material_slots:
            if slot.material is None:
                slot.material = post.material_slots[0].material
    return soften(post, 0.5)


def _wave_grooves_1712(u, v):
    """Four wavy grooves running in from the right-hand end, staggered in length."""
    best = 1.0
    for offset, start in ((-7.5, 27.5), (-2.5, 12.5), (2.5, 2.5), (7.5, 17.5)):
        if u < start:
            centre = offset + 1.1 * math.sin(2 * math.pi * (start - start) / 28)
            d = math.hypot(u - start, v - centre) - 0.8
        else:
            d = abs(v - (offset + 1.1 * math.sin(2 * math.pi * (u - start) / 28))) - 0.8
            if u > 148:
                d = max(d, u - 148)
        best = min(best, d)
    return best


def handle_1712():
    """Flat bar with wavy grooves toward one end, on square block posts."""
    half_t = 3.5
    bar = box('Bar', -152.5, 152.5, 13.5, half_t)
    loops = contours(_wave_grooves_1712, -0.5, 150.5, -13.5, 13.5, step=0.12)
    loops = [[(-2.5 + u, v) for u, v in loop] for loop in loops]  # grooves run from x=0 to the right end
    pocket(bar, cutter('Grooves', loops, on_face('z', 1, half_t, 1.0)), 'inlay')
    floor = -half_t - 24
    return [soften(bar, 0.5), *[block_post(f'Post {s}', s * 107.5, 8, 6, -half_t + 0.2, floor) for s in (-1, 1)]]


def handle_1717():
    """Square tube with polished square end bars telescoped into it, flanges at the joints, block posts."""
    tube, end, flange = 6.4, 5.0, 8.0
    parts = [box('Tube', -90, 90, tube, tube)]
    for s in (-1, 1):
        parts.append(box(f'End {s}', min(s * 90, s * 152.5), max(s * 90, s * 152.5), end, end, 'cap'))
        parts.append(box(f'Flange {s}', min(s * 90, s * 91.6), max(s * 90, s * 91.6), flange, flange))
    parts = [soften(p, 0.4) for p in parts]
    floor = -tube - 22
    return parts + [block_post(f'Post {s}', s * 76, 5.5, 4.5, -tube + 0.2, floor) for s in (-1, 1)]


def rose_post(name, x, top, floor, stem=4.5, rose=14.0, rose_h=3.6):
    """Slim stem on a round screw rose with two countersunk holes along the bar (the 26xx range)."""
    import bpy
    profile = [(0, 0), (0, stem), (floor - rose_h - 1.2, stem), (floor - rose_h - 0.4, stem + 0.8), (floor - rose_h, rose - 1.2),
               (floor - rose_h + 0.6, rose), (floor - 0.4, rose), (floor, rose - 0.4), (floor, 0)]
    from catalog3d import turned_post
    obj = turned_post(name, x, profile, 'bar', None)
    for side in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=1.6 * MM, radius2=3.2 * MM, depth=(rose_h + 0.6) * MM,
                                        location=((x + side * 9.2) * MM, 0, (-floor + rose_h / 2 + 0.25) * MM))
        drill = bpy.context.object
        mod = obj.modifiers.new('Screw', 'BOOLEAN')
        mod.object, mod.solver = drill, 'EXACT'
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
        bpy.data.objects.remove(drill)
        for slot in obj.material_slots:
            if slot.material is None:
                slot.material = obj.material_slots[0].material
    return obj


def ss_handle(cap, centres=225, bar_r=8.0, **options):
    """26xx range: a turned bar (brushed body, polished details) on rose posts."""
    bar = soften(turned_bar(cap, 305, **options), 0.2)
    floor = bar_r + 26
    return [bar, *[rose_post(f'Post {s}', s * centres / 2, 0, floor) for s in (-1, 1)]]


def _v_grooves(profile_r, xs, role='cap', depth=0.5, width=0.9):
    """Points for V grooves at xs along a plain radius."""
    pts = []
    for x in xs:
        pts += [(x - width / 2, profile_r, role), (x, profile_r - depth, role), (x + width / 2, profile_r, role)]
    return pts


SS = [('CP', {'bar': 'satin', 'cap': 'chrome'}), ('Gold', {'bar': 'gold_brushed', 'cap': 'gold_pvd'}),
      ('Antique', {'bar': 'antique_brushed', 'cap': 'antique'}), ('Rose gold', {'bar': 'rose_gold_brushed', 'cap': 'rose_gold_pvd'})]

CAP_2601 = [(0, 0), (0, 7.2), (0.6, 8.0)] + _v_grooves(8.0, [4.5, 8.0, 11.5]) + [(40, 8.0), (40.3, 7.7, 'bar'), (40.6, 8.0, 'bar')]
CAP_2602 = ([(0, 0), (0.8, 3.6), (2.2, 5.9), (4.0, 7.3), (6.0, 7.9), (7.0, 8.0, 'bar'), (138.5, 8.0, 'bar')]
            + ridges(138.5, 152.5, 4, 8.9, 7.8, groove_role='cap')[1:] + [(152.5, 7.8)])
CAP_2603 = ([(0, 0), (0, 7.2), (0.6, 8.0)] + _v_grooves(8.0, [4.0, 7.0, 10.0]) + [(24, 8.0), (24.3, 7.7, 'bar'), (24.6, 8.0, 'bar')]
            + [p for x in (68, 112) for p in [(x - 2.3, 8.0, 'bar'), (x - 2.0, 7.6, 'cap'), (x - 1.6, 8.0, 'cap'), (x + 1.6, 8.0, 'cap'),
                                              (x + 2.0, 7.6, 'cap'), (x + 2.3, 8.0, 'bar')]] + [(152.5, 8.0, 'bar')])
CAP_2604 = [(0, 0), (0, 7.2), (0.6, 8.0), (30, 8.0)] + _v_grooves(8.0, [31.5, 35.0]) + [(45, 8.0), (45.3, 7.7, 'bar'), (45.6, 8.0, 'bar')]
CAP_2605 = ([(0, 0), (6, 2.4), (11, 4.4), (12.5, 5.2), (13, 3.6), (14.5, 3.6), (15.5, 5.6), (17.0, 6.0), (18.5, 5.6), (19.2, 4.6),
             (20, 5.6), (21.5, 6.6), (23, 6.6), (24, 5.8), (25, 6.8), (26.5, 8.3), (28, 8.3), (28.4, 8.0, 'bar')]
            + dense(28.6, 152.5, 8.0, 0.5, 'bar'))
CAP_2606 = (ball(5.4, 2.8) + [(12, 2.9), (13.4, 4.4), (14.8, 5.4), (16.4, 5.4), (17.2, 4.4), (18.4, 5.6), (21.5, 6.6), (23, 6.6),
                              (24, 5.8), (25, 6.8), (26.5, 8.3), (28, 8.3), (28.4, 8.0, 'bar')] + dense(28.6, 152.5, 8.0, 0.5, 'bar'))
CAP_2607 = [(0, 0), (0, 7.4), (0.6, 8.2)] + [p for k in range(4) for p in [
    (0.6 + k * 37.9 + 1.0, 8.4, 'bar'), (0.6 + k * 37.9 + 10, 7.6, 'bar'), (0.6 + k * 37.9 + 22, 7.0, 'bar'),
    (0.6 + k * 37.9 + 34, 7.8, 'bar'), (0.6 + k * 37.9 + 36.4, 8.6, 'cap'), (0.6 + k * 37.9 + 37.9, 8.6, 'cap')]][:-2] + [(152.5, 7.0, 'bar')]
CAP_2608 = ([(0, 0), (0, 7.4), (0.6, 8.2), (16, 8.2), (16.4, 9.0), (18, 9.0), (18.4, 8.2), (20, 8.2), (20.4, 9.0), (22, 9.0), (22.4, 8.2)]
            + ridges(24, 152.5, 23, 9.4, 7.6)[0:] )
CAP_2609 = [(0, 0), (0, 7.2), (0.6, 8.0)] + [p for x in (30, 62, 94, 126) for p in [
    (x - 6, 8.0, 'bar'), (x - 2.0, 7.6, 'bar'), (x - 1.4, 8.6, 'cap'), (x - 0.4, 8.6, 'cap'), (x - 0.2, 8.0, 'cap'), (x + 0.2, 8.0, 'cap'),
    (x + 0.4, 8.6, 'cap'), (x + 1.4, 8.6, 'cap'), (x + 2.0, 7.6, 'bar'), (x + 6, 8.0, 'bar')]] + [(152.5, 8.0, 'bar')]
CAP_2610 = [(0, 0), (0, 7.2), (0.6, 8.0), (40, 8.0, 'bar')] + ridges(40, 152.5, 48, 8.3, 7.6, role='cap')[1:]
CAP_2611 = ([(0, 0), (0, 7.4), (0.6, 8.2), (36, 8.2)] + ridges(36, 46, 4, 8.8, 8.0)[1:]
            + [(46.4, 8.6, 'bar'), (60, 9.4, 'bar'), (75, 9.0, 'bar'), (100, 7.4, 'bar'), (125, 6.6, 'bar'), (146, 6.8, 'bar'), (149.5, 7.4, 'bar'),
               (150.4, 8.2), (152.5, 8.2)])

PRODUCTS.update({
    'door-handles-1712': dict(build=handle_1712, variants=[('A · Antique', {'bar': 'antique', 'inlay': 'black_matt'}),
                                                          ('B · Black', {'bar': 'black_matt', 'inlay': 'black_pvd'})]),
    'door-handles-1717': dict(build=handle_1717, variants=[('A · ' + N_GOLD_ANTIQUE, GOLD_ANTIQUE), ('B · ' + N_BLACK_BLACK, BLACK_BLACK),
                                                          ('C · ' + N_GOLD_GREEN, GOLD_GREEN), ('D · ' + N_ROSE_ROSE, ROSE_ROSE)]),
    'door-handles-2601': dict(build=lambda: ss_handle(CAP_2601), variants=SS),
    'door-handles-2602': dict(build=lambda: ss_handle(CAP_2602), variants=SS),
    'door-handles-2603': dict(build=lambda: ss_handle(CAP_2603), variants=SS),
    'door-handles-2604': dict(build=lambda: ss_handle(CAP_2604), variants=SS),
    'door-handles-2605': dict(build=lambda: ss_handle(CAP_2605, centres=195), variants=SS),
    'door-handles-2606': dict(build=lambda: ss_handle(CAP_2606, centres=195), variants=SS),
    'door-handles-2607': dict(build=lambda: ss_handle(CAP_2607), variants=SS),
    'door-handles-2608': dict(build=lambda: ss_handle(CAP_2608), variants=SS),
    'door-handles-2609': dict(build=lambda: ss_handle(CAP_2609), variants=SS),
    'door-handles-2610': dict(build=lambda: ss_handle(CAP_2610), variants=SS),
    'door-handles-2611': dict(build=lambda: ss_handle(CAP_2611), variants=SS),
})
