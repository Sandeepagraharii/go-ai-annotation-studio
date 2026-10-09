/**
 * GO-AI Annotation Practice Studio - Annotation Guidelines & Standards
 * Direct mapping to Amazon Robotics Fulfillment Center Human-in-the-Loop SOP.
 */

window.ANNOTATION_GUIDELINES = {
  version: "2.4 - GO-AI Robotics Operational Standard",
  effectiveDate: "2026",
  categories: [
    {
      id: "general_rules",
      title: "1. Core Quality & Bounding Box Principles",
      rules: [
        {
          name: "The Tight Box Rule (Obsessive Precision)",
          description: "Bounding boxes must snugly enclose the outermost physical boundary of the object. Do not include shadows, reflections, floor markings, or empty air buffers. A loose box degrades robotic pick-and-place coordinate accuracy.",
          badge: "MANDATORY",
          badExample: "Box margins > 5px away from carton perimeter or including dark shadow gradients.",
          goodExample: "Top, bottom, left, and right box borders directly tangent to package cardboard/plastic edges."
        },
        {
          name: "Orthogonal Alignment",
          description: "All bounding boxes are axis-aligned (orthogonal to camera sensor). Ensure width and height span the extreme extents of non-perpendicular or angled items.",
          badge: "STANDARD"
        },
        {
          name: "When NOT to Annotate",
          description: "Do NOT annotate: (1) Objects smaller than 15x15 pixels in visual area, (2) Floor tape, barcode stickers on conveyor beds, (3) Facility infrastructure (bollards, yellow guard rails, conveyor steel beams), (4) Shadows or optical glare.",
          badge: "CRITICAL"
        }
      ]
    },
    {
      id: "edge_cases",
      title: "2. Edge Cases & Ambiguity Resolution",
      rules: [
        {
          name: "Occluded Objects (Partial Obscurity)",
          description: "When an object is partially blocked by another foreground item (e.g., a box sitting behind a tote), draw the bounding box ONLY around the VISIBLE pixels. Mark the 'Occluded' attribute checkbox. Never guess or extrapolate hidden boundaries.",
          badge: "EDGE CASE"
        },
        {
          name: "Truncated Objects (Frame Boundary Cut-off)",
          description: "If an item extends beyond the camera field of view (touching or cut off by the canvas edge), extend the bounding box right up to the image boundary. Mark the 'Truncated' attribute checkbox.",
          badge: "EDGE CASE"
        },
        {
          name: "Damaged Package vs Normal Item",
          description: "A package is classified as 'Damaged Package' (and checked 'Damaged') if there is structural deformation: crushed corners > 25% depth, punctured or torn corrugated walls, open bursting seams, or exposed contents. Superficial cosmetic scuffs or printed wrinkles do NOT count as damaged.",
          badge: "DEFECT ESCALATION"
        },
        {
          name: "Overlapping Flexible Mailers",
          description: "Polybags and padded mailers often layer on sortation slides. Identify distinct thermal tracking labels or heat-sealed perimeter ridges to separate adjacent mailers into individual boxes.",
          badge: "SORTATION RULE"
        }
      ]
    },
    {
      id: "label_definitions",
      title: "3. Class Label Taxonomies & Definitions",
      labels: [
        {
          name: "Cardboard Box",
          key: "1",
          color: "#f59e0b",
          icon: "📦",
          description: "Rigid corrugated fiberboard shipping container (RSC, fold-over cartons). Has defined planar faces and corners.",
          criteria: "Check for rigid crease lines, taped seams, and rectangular profiles."
        },
        {
          name: "Polybag",
          key: "2",
          color: "#06b6d4",
          icon: "✉️",
          description: "Flexible plastic mailer or envelope, typically polyethylene (white/blue or grey). Deformable shape.",
          criteria: "Look for crinkled surface reflections, flexible plastic silhouette, and barcode print on plastic."
        },
        {
          name: "Envelope",
          key: "3",
          color: "#10b981",
          icon: "📄",
          description: "Paper, cardstock, or kraft paper mailer (including bubble-padded kraft mailers). Semi-rigid flat profile.",
          criteria: "Flat document envelope or brown kraft bubble mailer. Rigid or semi-rigid paper texture."
        },
        {
          name: "Tote",
          key: "4",
          color: "#3b82f6",
          icon: "🧺",
          description: "Reusable molded plastic container used for internal FC conveyance (standard yellow or blue Amazon tote).",
          criteria: "Heavy plastic ribbed walls, molded hand-holds, ribbed perimeter lip."
        },
        {
          name: "Pallet",
          key: "5",
          color: "#8b5cf6",
          icon: "🪵",
          description: "Wooden GMA standard 48x40 skid or plastic pallet base supporting bulk cartons or stacked inventory.",
          criteria: "Wood timber deck boards, stringers, or heavy black molded plastic pallet base."
        },
        {
          name: "Damaged Package",
          key: "6",
          color: "#ef4444",
          icon: "⚠️",
          description: "Any packaging unit exhibiting severe crushing, puncture, structural collapse, or ruptured tape seal.",
          criteria: "Crushed carton walls, ruptured seams, torn envelopes with contents visible, or squashed polybags."
        }
      ]
    }
  ]
};
