/**
 * GO-AI Annotation Practice Studio - Ground Truth Repository
 * Provides offline-compatible ground truth data for 8 fulfillment scenes.
 * Matches data/ground_truth.json exactly for file:// and http:// execution.
 */
window.GROUND_TRUTH_DATA = {
  "tasks": [
    {
      "id": "task-1",
      "title": "Task 1: Packing Station Infeed",
      "difficulty": "Easy",
      "category": "Packaging & Infeed",
      "description": "Annotate all outbound packages resting on the packing table. Pay special attention to package boundaries and differentiate between cardboard boxes and padded mailers.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "conveyor_table"
      },
      "objects": [
        {
          "id": "gt-1-1",
          "label": "Cardboard Box",
          "box": { "x": 60, "y": 140, "width": 170, "height": 190 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Standard 1A5 corrugated carton. Ensure box edges fit snug without including shadows."
        },
        {
          "id": "gt-1-2",
          "label": "Cardboard Box",
          "box": { "x": 260, "y": 100, "width": 210, "height": 160 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Medium 2B4 shipping carton with visible barcode label."
        },
        {
          "id": "gt-1-3",
          "label": "Envelope",
          "box": { "x": 510, "y": 190, "width": 160, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Kraft bubble mailer envelope. Label as Envelope, not Polybag."
        },
        {
          "id": "gt-1-4",
          "label": "Cardboard Box",
          "box": { "x": 310, "y": 300, "width": 190, "height": 180 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Heavyweight cube carton positioned in foreground."
        }
      ]
    },
    {
      "id": "task-2",
      "title": "Task 2: Sortation Rack with Occlusion",
      "difficulty": "Medium",
      "category": "Sortation Automation",
      "description": "Annotate items inside the sortation pigeonhole shelf. Note the partially hidden cardboard box behind the yellow tote bin (Occluded rule).",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "shelf_rack"
      },
      "objects": [
        {
          "id": "gt-2-1",
          "label": "Tote",
          "box": { "x": 70, "y": 120, "width": 200, "height": 160 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Standard yellow fulfillment tote bin on top shelf."
        },
        {
          "id": "gt-2-2",
          "label": "Cardboard Box",
          "box": { "x": 210, "y": 150, "width": 150, "height": 130 },
          "attributes": { "occluded": true, "truncated": false, "damaged": false },
          "guidance": "Partially occluded box behind yellow tote. Draw box hugging only visible extent, check 'Occluded'."
        },
        {
          "id": "gt-2-3",
          "label": "Cardboard Box",
          "box": { "x": 420, "y": 90, "width": 160, "height": 190 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Tall vertical box in center shelf."
        },
        {
          "id": "gt-2-4",
          "label": "Tote",
          "box": { "x": 100, "y": 320, "width": 220, "height": 170 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Blue transfer tote bin on lower shelf."
        },
        {
          "id": "gt-2-5",
          "label": "Polybag",
          "box": { "x": 370, "y": 340, "width": 180, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "White and blue plastic shipping polybag resting flat."
        }
      ]
    },
    {
      "id": "task-3",
      "title": "Task 3: Inbound Pallet Staging & Damaged Carton",
      "difficulty": "Hard",
      "category": "Inventory Storage",
      "description": "Annotate the pallet base, stacked cartons, and flag the package with severe corner crushing as 'Damaged Package'.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "pallet_staging"
      },
      "objects": [
        {
          "id": "gt-3-1",
          "label": "Pallet",
          "box": { "x": 120, "y": 380, "width": 560, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Heavy-duty wooden GMA 48x40 pallet base supporting load."
        },
        {
          "id": "gt-3-2",
          "label": "Cardboard Box",
          "box": { "x": 150, "y": 240, "width": 180, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Bottom layer left carton."
        },
        {
          "id": "gt-3-3",
          "label": "Damaged Package",
          "box": { "x": 340, "y": 230, "width": 170, "height": 160 },
          "attributes": { "occluded": false, "truncated": false, "damaged": true },
          "guidance": "Crushed corner with torn security tape. Label as Damaged Package and mark 'Damaged'."
        },
        {
          "id": "gt-3-4",
          "label": "Cardboard Box",
          "box": { "x": 520, "y": 240, "width": 140, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Rightmost tier-1 box."
        },
        {
          "id": "gt-3-5",
          "label": "Cardboard Box",
          "box": { "x": 200, "y": 100, "width": 190, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Tier-2 upper left box."
        },
        {
          "id": "gt-3-6",
          "label": "Cardboard Box",
          "box": { "x": 410, "y": 110, "width": 200, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Tier-2 upper right box."
        }
      ]
    },
    {
      "id": "task-4",
      "title": "Task 4: High-Speed Polybag Sortation Chute",
      "difficulty": "Medium",
      "category": "Sortation Automation",
      "description": "Annotate packages sliding down the steel chute. Distinguish between flexible polybags and rigid kraft mailers.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "chute_slide"
      },
      "objects": [
        {
          "id": "gt-4-1",
          "label": "Polybag",
          "box": { "x": 100, "y": 100, "width": 190, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Grey flexible polybag with tracking barcode."
        },
        {
          "id": "gt-4-2",
          "label": "Envelope",
          "box": { "x": 330, "y": 80, "width": 170, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Cardstock document mailer."
        },
        {
          "id": "gt-4-3",
          "label": "Polybag",
          "box": { "x": 480, "y": 160, "width": 200, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Amazon Prime branded polybag with blue/cyan print."
        },
        {
          "id": "gt-4-4",
          "label": "Envelope",
          "box": { "x": 180, "y": 280, "width": 190, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Brown padded kraft bubble envelope."
        },
        {
          "id": "gt-4-5",
          "label": "Polybag",
          "box": { "x": 400, "y": 310, "width": 210, "height": 160 },
          "attributes": { "occluded": true, "truncated": false, "damaged": false },
          "guidance": "Polybag partially overlapped by upper envelope edge."
        }
      ]
    },
    {
      "id": "task-5",
      "title": "Task 5: Quality Audit & Damaged Package Station",
      "difficulty": "Medium",
      "category": "Packaging Innovation",
      "description": "Inspect damaged goods diverted for QA repacking. Classify damaged items with obsessive precision.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "qa_station"
      },
      "objects": [
        {
          "id": "gt-5-1",
          "label": "Damaged Package",
          "box": { "x": 90, "y": 150, "width": 200, "height": 190 },
          "attributes": { "occluded": false, "truncated": false, "damaged": true },
          "guidance": "Punctured carton wall with internal padding protruding. Tag as Damaged Package."
        },
        {
          "id": "gt-5-2",
          "label": "Cardboard Box",
          "box": { "x": 330, "y": 130, "width": 180, "height": 160 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Standard undamaged replacement box."
        },
        {
          "id": "gt-5-3",
          "label": "Envelope",
          "box": { "x": 550, "y": 160, "width": 160, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Intact cardboard document envelope."
        },
        {
          "id": "gt-5-4",
          "label": "Polybag",
          "box": { "x": 260, "y": 330, "width": 240, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Polybag mailer awaiting destination scan."
        }
      ]
    },
    {
      "id": "task-6",
      "title": "Task 6: High-Speed Roller Conveyor & Truncation",
      "difficulty": "Hard",
      "category": "Sortation Automation",
      "description": "Annotate packages traveling on active rollers. Box #1 is partially cut off at the left frame edge (Truncated rule).",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "conveyor_belt"
      },
      "objects": [
        {
          "id": "gt-6-1",
          "label": "Cardboard Box",
          "box": { "x": 0, "y": 190, "width": 110, "height": 180 },
          "attributes": { "occluded": false, "truncated": true, "damaged": false },
          "guidance": "Truncated box entering camera FOV. Draw box right to canvas edge (x=0) and mark 'Truncated'."
        },
        {
          "id": "gt-6-2",
          "label": "Cardboard Box",
          "box": { "x": 150, "y": 160, "width": 170, "height": 170 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Medium carton centered on roller belt."
        },
        {
          "id": "gt-6-3",
          "label": "Tote",
          "box": { "x": 360, "y": 140, "width": 210, "height": 180 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Blue multi-purpose tote bin on conveyor."
        },
        {
          "id": "gt-6-4",
          "label": "Envelope",
          "box": { "x": 610, "y": 180, "width": 150, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Small envelope nearing divergence arm."
        },
        {
          "id": "gt-6-5",
          "label": "Polybag",
          "box": { "x": 240, "y": 350, "width": 180, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Small polybag placed in front staging slot."
        },
        {
          "id": "gt-6-6",
          "label": "Cardboard Box",
          "box": { "x": 480, "y": 340, "width": 190, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Staged buffer carton."
        }
      ]
    },
    {
      "id": "task-7",
      "title": "Task 7: Robotics Mobile Drive Stow Pod",
      "difficulty": "Hard",
      "category": "Object Manipulation",
      "description": "Annotate items inside Amazon Robotics mobile drive shelving pods. Dense multi-item scene with occlusions.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "robotic_pod"
      },
      "objects": [
        {
          "id": "gt-7-1",
          "label": "Tote",
          "box": { "x": 70, "y": 70, "width": 190, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Pod bin A1 yellow tote."
        },
        {
          "id": "gt-7-2",
          "label": "Cardboard Box",
          "box": { "x": 280, "y": 80, "width": 160, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Pod bin A2 compact corrugated box."
        },
        {
          "id": "gt-7-3",
          "label": "Envelope",
          "box": { "x": 470, "y": 90, "width": 150, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Pod bin A3 bubble envelope."
        },
        {
          "id": "gt-7-4",
          "label": "Tote",
          "box": { "x": 640, "y": 80, "width": 140, "height": 150 },
          "attributes": { "occluded": false, "truncated": true, "damaged": false },
          "guidance": "Pod bin A4 tote abutting right pod column."
        },
        {
          "id": "gt-7-5",
          "label": "Polybag",
          "box": { "x": 90, "y": 270, "width": 180, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Pod bin B1 soft polybag."
        },
        {
          "id": "gt-7-6",
          "label": "Cardboard Box",
          "box": { "x": 250, "y": 310, "width": 140, "height": 130 },
          "attributes": { "occluded": true, "truncated": false, "damaged": false },
          "guidance": "Box partially occluded by front lip and tote corner."
        },
        {
          "id": "gt-7-7",
          "label": "Cardboard Box",
          "box": { "x": 440, "y": 260, "width": 210, "height": 170 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Pod bin B3 large inventory carton."
        }
      ]
    },
    {
      "id": "task-8",
      "title": "Task 8: End-of-Arm Robotic Stacking & Palletizing",
      "difficulty": "Hard",
      "category": "Object Manipulation",
      "description": "Complex palletizing station. Label the pallet, stacked inventory, and spot the damaged carton crushed under top tier.",
      "scene": {
        "width": 800,
        "height": 550,
        "background": "robotic_arm_pallet"
      },
      "objects": [
        {
          "id": "gt-8-1",
          "label": "Pallet",
          "box": { "x": 100, "y": 390, "width": 600, "height": 130 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Heavy timber pallet foundation on load cell."
        },
        {
          "id": "gt-8-2",
          "label": "Cardboard Box",
          "box": { "x": 130, "y": 230, "width": 190, "height": 170 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Base layer carton left."
        },
        {
          "id": "gt-8-3",
          "label": "Damaged Package",
          "box": { "x": 340, "y": 240, "width": 170, "height": 160 },
          "attributes": { "occluded": false, "truncated": false, "damaged": true },
          "guidance": "Severely deformed package with crumpled sidewall. Label Damaged Package."
        },
        {
          "id": "gt-8-4",
          "label": "Cardboard Box",
          "box": { "x": 530, "y": 230, "width": 150, "height": 170 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Base layer carton right."
        },
        {
          "id": "gt-8-5",
          "label": "Cardboard Box",
          "box": { "x": 180, "y": 90, "width": 200, "height": 150 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Upper tier left box positioned by robotic gripper."
        },
        {
          "id": "gt-8-6",
          "label": "Polybag",
          "box": { "x": 420, "y": 100, "width": 180, "height": 140 },
          "attributes": { "occluded": false, "truncated": false, "damaged": false },
          "guidance": "Upper tier padded package in transit."
        }
      ]
    }
  ]
};
