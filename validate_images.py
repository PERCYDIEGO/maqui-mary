"""Validacion visual de imagenes en maquimary-premium.html"""
from playwright.sync_api import sync_playwright

URL = "http://localhost:3002/maquimary-premium.html"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()

    page.goto(URL)
    page.wait_for_load_state("networkidle")

    page.screenshot(path="/tmp/maquimary-fullpage.png", full_page=True)
    page.screenshot(path="/tmp/maquimary-viewport.png")

    img_issues = []
    images = page.query_selector_all("img")
    print(f"\n=== {len(images)} imagenes encontradas ===\n")

    for i, img in enumerate(images):
        src = img.get_attribute("src") or "(sin src)"
        alt = img.get_attribute("alt") or "(sin alt)"
        loaded = img.evaluate("el => el.complete && el.naturalWidth > 0")
        natural_w = img.evaluate("el => el.naturalWidth")
        natural_h = img.evaluate("el => el.naturalHeight")
        display_w = img.evaluate("el => el.offsetWidth")
        display_h = img.evaluate("el => el.offsetHeight")

        parent = img.evaluate("""el => {
            const p = el.parentElement;
            if (!p) return 'no parent';
            const s = getComputedStyle(p);
            return `display:${s.display} align-items:${s.alignItems} justify-content:${s.justifyContent} text-align:${s.textAlign}`;
        }""")

        status = "[OK]" if loaded else "[FAIL]"
        print(f"{status} [{i}] src={src}")
        print(f"   alt={alt}")
        print(f"   natural={natural_w}x{natural_h} display={display_w}x{display_h}")
        print(f"   parent: {parent}")

        if not loaded:
            img_issues.append(f"IMAGEN NO CARGADA: {src}")

        if natural_w > 0 and natural_h > 0 and display_w > 0 and display_h > 0:
            nat_aspect = natural_w / natural_h
            disp_aspect = display_w / display_h
            ratio_diff = abs(nat_aspect - disp_aspect) / max(nat_aspect, disp_aspect)
            if ratio_diff > 0.15:
                img_issues.append(f"Proporcion extrana en {src}: natural {nat_aspect:.2f} vs display {disp_aspect:.2f}")

        if display_w < 50 and display_h < 50 and loaded:
            img_issues.append(f"Imagen muy pequena: {src} ({display_w}x{display_h})")

    hero_visual = page.query_selector(".hero-visual")
    if hero_visual:
        hero_bb = hero_visual.bounding_box()
        pg = page.query_selector(".hero-grid")
        parent_bb = pg.bounding_box() if pg else None
        if hero_bb and parent_bb:
            visual_center_x = hero_bb["x"] + hero_bb["width"] / 2
            grid_center_x = parent_bb["x"] + parent_bb["width"] * 0.75
            offset = abs(visual_center_x - grid_center_x)
            flag = "[OK]" if offset < 50 else "[WARN]"
            print(f"\n{flag} Hero visual center offset from right-half: {offset:.0f}px")

    bento_items = page.query_selector_all(".bento-item")
    print(f"\n=== Bento items: {len(bento_items)} ===")
    for item in bento_items:
        bb = item.bounding_box()
        if not bb:
            continue
        img_in = item.query_selector("img")
        if not img_in:
            print(f"   [SKIP] no img in bento item at {bb['x']:.0f},{bb['y']:.0f}")
            continue
        img_bb = img_in.bounding_box()
        if not img_bb:
            continue
        img_center = img_bb["x"] + img_bb["width"] / 2
        item_center = bb["x"] + bb["width"] / 2
        h_offset = abs(img_center - item_center)
        flag = "[WARN]" if h_offset > 10 else "[OK]"
        print(f"   {flag} image horizontal offset: {h_offset:.0f}px")

    # Nav logo check
    nav_logo = page.query_selector(".nav-logo img")
    if nav_logo:
        nav_bb = nav_logo.bounding_box()
        if nav_bb:
            print(f"\n   Nav logo size: {nav_bb['width']:.0f}x{nav_bb['height']:.0f}")
            too_small = "[WARN]" if nav_bb["width"] < 24 else "[OK]"
            print(f"   {too_small} nav logo minimum size check")

    print(f"\n{'='*50}")
    if img_issues:
        print(f"ISSUES ({len(img_issues)}):")
        for issue in img_issues:
            print(f"  * {issue}")
    else:
        print("[OK] Todas las imagenes OK")

    print(f"\nScreenshots: /tmp/maquimary-fullpage.png, /tmp/maquimary-viewport.png")
    browser.close()
