#!/usr/bin/env python3
"""
Generate Google Material Design 3 icons for OmniGrab Chrome Extension.
Creates icons in 16x16, 32x32, 48x48, 128x128, and a master SVG.
"""

import os
from PIL import Image, ImageDraw, ImageFilter

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_master_icon(size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    margin = size * 0.08
    corner_radius = size * 0.26
    
    # Soft shadow
    shadow_box = [margin, margin + (size * 0.04), size - margin, size - margin + (size * 0.04)]
    s_draw.rounded_rectangle(shadow_box, radius=corner_radius, fill=(11, 87, 208, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.035))
    img.alpha_composite(shadow)
    
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    main_box = [margin, margin, size - margin, size - margin]
    
    # Gradient: Google Blue (#4285F4) -> #1A73E8 -> #0B57D0
    grad_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    for y in range(int(margin), int(size - margin)):
        t = (y - margin) / (size - 2 * margin)
        r = int(66 * (1 - t) + 11 * t)
        g = int(133 * (1 - t) + 87 * t)
        b = int(244 * (1 - t) + 208 * t)
        for x in range(int(margin), int(size - margin)):
            grad_img.putpixel((x, y), (r, g, b, 255))
            
    mask = Image.new("L", (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle(main_box, radius=corner_radius, fill=255)
    
    badge.paste(grad_img, (0, 0), mask)
    img.alpha_composite(badge)
    
    art = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    a_draw = ImageDraw.Draw(art)
    
    cx, cy = size / 2, size / 2 - (size * 0.01)
    
    # Arrow Stem
    stem_w = size * 0.11
    stem_top = cy - (size * 0.22)
    stem_bottom = cy + (size * 0.05)
    a_draw.rounded_rectangle(
        [cx - stem_w / 2, stem_top, cx + stem_w / 2, stem_bottom],
        radius=stem_w / 2,
        fill=(255, 255, 255, 255)
    )
    
    # Arrow Head
    arrow_tip_y = cy + (size * 0.19)
    arrow_left_x = cx - (size * 0.20)
    arrow_right_x = cx + (size * 0.20)
    arrow_base_y = cy + (size * 0.02)
    
    chevron_pts = [
        (cx, arrow_tip_y),
        (arrow_right_x, arrow_base_y),
        (arrow_right_x - (size * 0.07), arrow_base_y),
        (cx, arrow_tip_y - (size * 0.08)),
        (arrow_left_x + (size * 0.07), arrow_base_y),
        (arrow_left_x, arrow_base_y)
    ]
    a_draw.polygon(chevron_pts, fill=(255, 255, 255, 255))
    
    # Bottom tray
    tray_y = cy + (size * 0.24)
    tray_h = size * 0.065
    tray_w = size * 0.44
    tray_r = tray_h / 2
    a_draw.rounded_rectangle(
        [cx - tray_w / 2, tray_y, cx + tray_w / 2, tray_y + tray_h],
        radius=tray_r,
        fill=(255, 255, 255, 240)
    )
    
    # 4 Google-colored dots
    dot_r = size * 0.022
    dot_y = tray_y + tray_h + (size * 0.05)
    dot_colors = [
        (66, 133, 244, 255),  # Blue
        (234, 67, 53, 255),   # Red
        (251, 188, 5, 255),   # Yellow
        (52, 168, 83, 255)    # Green
    ]
    dot_spacing = size * 0.065
    start_dot_x = cx - (1.5 * dot_spacing)
    for i, col in enumerate(dot_colors):
        dx = start_dot_x + i * dot_spacing
        a_draw.ellipse([dx - dot_r, dot_y - dot_r, dx + dot_r, dot_y + dot_r], fill=col)
    
    img.alpha_composite(art)
    return img

def main():
    master = create_master_icon(512)
    sizes = [16, 32, 48, 128]
    for sz in sizes:
        resized = master.resize((sz, sz), Image.Resampling.LANCZOS)
        out_path = os.path.join(OUTPUT_DIR, f"icon-{sz}.png")
        resized.save(out_path, "PNG", optimize=True)
        print(f"Created {out_path} ({sz}x{sz})")

    svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="googleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#4285F4"/>
      <stop offset="60%" stop-color="#1A73E8"/>
      <stop offset="100%" stop-color="#0B57D0"/>
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0B57D0" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Background Squircle -->
  <rect x="10" y="8" width="108" height="108" rx="28" fill="url(#googleGrad)" filter="url(#dropShadow)"/>
  
  <!-- White Arrow Stem -->
  <rect x="58" y="28" width="12" height="34" rx="6" fill="#FFFFFF"/>
  
  <!-- Arrow Head Chevron -->
  <path d="M 64 78 L 86 56 L 78 56 L 64 68 L 50 56 L 42 56 Z" fill="#FFFFFF"/>
  
  <!-- Tray / Media Base -->
  <rect x="36" y="86" width="56" height="8" rx="4" fill="#FFFFFF"/>
  
  <!-- Google 4-Color Accent Dots -->
  <circle cx="49" cy="102" r="3" fill="#4285F4"/>
  <circle cx="59" cy="102" r="3" fill="#EA4335"/>
  <circle cx="69" cy="102" r="3" fill="#FBBC05"/>
  <circle cx="79" cy="102" r="3" fill="#34A853"/>
</svg>"""

    svg_path = os.path.join(OUTPUT_DIR, "icon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Created {svg_path}")

if __name__ == "__main__":
    main()
