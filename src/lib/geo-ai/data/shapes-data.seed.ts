const shapesDatabase = {
  "shapes": {
    "cylinder": {
      "nameVi": "Hình trụ",
      "type": "curved",
      "level": "cap2",
      "parserKeywords": [
        "hình trụ",
        "trụ tròn xoay",
        "khối trụ",
        "cylinder"
      ],
      "fallbackSpec": {
        "shape": "cylinder",
        "vertices": [
          "O",
          "O1"
        ],
        "params": {
          "r": 1,
          "h": 2
        },
        "conditions": []
      },
      "topology": {
        "vertices": 0,
        "edges": 2,
        "faces": 3,
        "euler": null
      },
      "formulas": {
        "volume": {
          "text": "V = πr²h",
          "latex": "V = \\pi r^2 h"
        },
        "lateralArea": {
          "text": "Sxq = 2πrh",
          "latex": "S_{xq} = 2\\pi rh"
        },
        "surfaceArea": {
          "text": "Stp = 2πr(r + h)",
          "latex": "S_{tp} = 2\\pi r(r+h)"
        }
      },
      "lessonContent": {
        "recognition": [
          "Hình trụ có hai đáy là hình tròn.",
          "Mặt xung quanh là mặt cong, không có góc.",
          "Các đường sinh (đường nối hai đáy) song song và bằng nhau.",
          "Ví dụ thực tế: lon nước ngọt, ống nước, hộp sữa đặc."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "Hình trụ không có đỉnh."
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "Hình trụ không có cạnh."
            ]
          },
          {
            "category": "Mặt",
            "items": [
              "Mặt đáy trên (hình tròn)",
              "Mặt đáy dưới (hình tròn)",
              "Mặt xung quanh (mặt cong)"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Công thức thể tích hình trụ",
            "description": "Thể tích hình trụ bằng tích của diện tích đáy và chiều cao.",
            "latex": "V = \\pi r^2 h"
          }
        ],
        "formulas": [
          {
            "title": "Diện tích xung quanh",
            "description": "Diện tích xung quanh bằng chu vi đáy nhân chiều cao.",
            "latex": "S_{xq} = 2\\pi r h"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Diện tích toàn phần bằng diện tích xung quanh cộng diện tích hai đáy.",
            "latex": "S_{tp} = 2\\pi r (r + h)"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {},
        "edges": {},
        "faces": {
          "Mặt đáy trên": "Đây là mặt đáy trên, hình tròn có bán kính r.",
          "Mặt đáy dưới": "Đây là mặt đáy dưới, hình tròn bằng với mặt đáy trên.",
          "Mặt xung quanh": "Đây là mặt xung quanh, một mặt cong nối hai đáy."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để phân biệt hình trụ với hình nón?",
        "Nếu gấp đôi chiều cao thì thể tích thay đổi thế nào?"
      ]
    },
    "cone": {
      "nameVi": "Hình nón",
      "type": "curved",
      "level": "cap2",
      "parserKeywords": [
        "hình nón",
        "nón tròn xoay",
        "khối nón",
        "cone"
      ],
      "fallbackSpec": {
        "shape": "cone",
        "vertices": [
          "O",
          "S"
        ],
        "params": {
          "r": 1,
          "h": 2
        },
        "conditions": []
      },
      "topology": {
        "vertices": 1,
        "edges": 1,
        "faces": 2,
        "euler": null
      },
      "formulas": {
        "volume": {
          "text": "V = (1/3)πr²h",
          "latex": "V = \\dfrac{1}{3}\\pi r^2 h"
        },
        "lateralArea": {
          "text": "Sxq = πrl",
          "latex": "S_{xq} = \\pi rl"
        },
        "surfaceArea": {
          "text": "Stp = πr(r + l)",
          "latex": "S_{tp} = \\pi r(r+l)"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có một đỉnh nhọn",
          "Đáy là hình tròn",
          "Mặt xung quanh là mặt cong",
          "Ví dụ thực tế: nón lá, phễu, kem ốc quế"
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "S — đỉnh nhọn của hình nón"
            ]
          },
          {
            "category": "Đáy",
            "items": [
              "O — tâm đáy",
              "AB — đường kính đáy"
            ]
          },
          {
            "category": "Đường sinh",
            "items": [
              "SA — đường sinh nối đỉnh S với điểm A trên đáy"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Quan hệ thể tích nón và trụ",
            "description": "Thể tích hình nón bằng 1/3 thể tích hình trụ cùng đáy và chiều cao.",
            "latex": "V_{\\text{nón}} = \\frac{1}{3} V_{\\text{trụ}}"
          }
        ],
        "formulas": [
          {
            "title": "Thể tích",
            "description": "V = (1/3)πr²h",
            "latex": "V = \\frac{1}{3} \\pi r^2 h"
          },
          {
            "title": "Diện tích xung quanh",
            "description": "Sxq = πrl",
            "latex": "S_{xq} = \\pi r l"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Stp = πr(r + l)",
            "latex": "S_{tp} = \\pi r (r + l)"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "S": "Đây là đỉnh S, điểm nhọn trên cùng của hình nón."
        },
        "edges": {
          "SA": "Đây là đường sinh SA, nối đỉnh S với điểm A trên đường tròn đáy."
        },
        "faces": {
          "đáy": "Mặt đáy là hình tròn tâm O.",
          "xung quanh": "Mặt xung quanh là mặt cong tạo bởi các đường sinh."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để phân biệt hình nón với hình trụ?",
        "Nếu tăng gấp đôi bán kính đáy thì thể tích thay đổi thế nào?"
      ]
    },
    "sphere": {
      "nameVi": "Hình cầu",
      "type": "curved",
      "level": "cap2",
      "parserKeywords": [
        "hình cầu",
        "khối cầu",
        "sphere"
      ],
      "fallbackSpec": {
        "shape": "sphere",
        "vertices": [
          "O"
        ],
        "params": {
          "r": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 0,
        "edges": 0,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "volume": {
          "text": "V = (4/3)πr³",
          "latex": "V = \\dfrac{4}{3}\\pi r^3"
        },
        "surfaceArea": {
          "text": "S = 4πr²",
          "latex": "S = 4\\pi r^2"
        }
      },
      "lessonContent": {
        "recognition": [
          "Hình cầu không có cạnh, không có đỉnh.",
          "Mọi điểm trên mặt cầu cách tâm một khoảng bằng bán kính.",
          "Hình cầu có vô số mặt phẳng đối xứng đi qua tâm.",
          "Ví dụ thực tế: quả bóng, quả địa cầu, viên bi, quả cam."
        ],
        "objects": [
          {
            "category": "Tâm",
            "items": [
              "O — tâm của hình cầu, là điểm cách đều mọi điểm trên mặt cầu."
            ]
          },
          {
            "category": "Bán kính",
            "items": [
              "r — khoảng cách từ tâm đến một điểm bất kỳ trên mặt cầu."
            ]
          },
          {
            "category": "Đường kính",
            "items": [
              "d = 2r — đoạn thẳng đi qua tâm và nối hai điểm trên mặt cầu."
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đối xứng",
            "description": "Hình cầu có vô số mặt phẳng đối xứng, mọi mặt phẳng đi qua tâm đều chia hình cầu thành hai nửa bằng nhau.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích mặt cầu",
            "description": "Diện tích mặt cầu bằng 4 lần diện tích hình tròn lớn.",
            "latex": "S = 4\\pi r^2"
          },
          {
            "title": "Thể tích hình cầu",
            "description": "Thể tích hình cầu bằng 4/3 lần tích của π với lập phương bán kính.",
            "latex": "V = \\frac{4}{3}\\pi r^3"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {},
        "edges": {},
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để tính diện tích mặt cầu khi biết bán kính?",
        "Thể tích hình cầu thay đổi thế nào nếu bán kính tăng gấp đôi?"
      ]
    },
    "cube": {
      "nameVi": "Hình lập phương",
      "type": "polyhedron",
      "level": "cap2",
      "parserKeywords": [
        "hình lập phương",
        "cube"
      ],
      "fallbackSpec": {
        "shape": "cube",
        "vertices": [
          "A",
          "B",
          "C",
          "D",
          "A1",
          "B1",
          "C1",
          "D1"
        ],
        "params": {
          "a": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 8,
        "edges": 12,
        "faces": 6,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = a³",
          "latex": "V = a^3"
        },
        "lateralArea": {
          "text": "Sxq = 4a²",
          "latex": "S_{xq} = 4a^2"
        },
        "surfaceArea": {
          "text": "Stp = 6a²",
          "latex": "S_{tp} = 6a^2"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có 6 mặt đều là hình vuông.",
          "Có 12 cạnh bằng nhau.",
          "Có 8 đỉnh, mỗi đỉnh là giao của 3 cạnh.",
          "Ví dụ thực tế: khối rubik, hộp quà hình lập phương."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh phía trước bên trái của mặt đáy",
              "B — đỉnh phía trước bên phải của mặt đáy",
              "C — đỉnh phía sau bên phải của mặt đáy",
              "D — đỉnh phía sau bên trái của mặt đáy",
              "A' — đỉnh phía trên tương ứng với A",
              "B' — đỉnh phía trên tương ứng với B",
              "C' — đỉnh phía trên tương ứng với C",
              "D' — đỉnh phía trên tương ứng với D"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy nối A và B",
              "BC — cạnh đáy nối B và C",
              "CD — cạnh đáy nối C và D",
              "DA — cạnh đáy nối D và A"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABCD — mặt đáy dưới",
              "A'B'C'D' — mặt đáy trên"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất hình lập phương",
            "description": "Hình lập phương có tất cả các cạnh bằng nhau, các mặt là hình vuông bằng nhau.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Thể tích",
            "description": "Thể tích bằng cạnh mũ ba.",
            "latex": "V = a^3"
          },
          {
            "title": "Diện tích xung quanh",
            "description": "Diện tích xung quanh bằng bốn lần diện tích một mặt.",
            "latex": "S_{xq} = 4a^2"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Diện tích toàn phần bằng sáu lần diện tích một mặt.",
            "latex": "S_{tp} = 6a^2"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, nơi gặp nhau của ba cạnh: AB, AD và AA'.",
          "B": "Đây là đỉnh B, nơi gặp nhau của ba cạnh: AB, BC và BB'.",
          "C": "Đây là đỉnh C, nơi gặp nhau của ba cạnh: BC, CD và CC'.",
          "D": "Đây là đỉnh D, nơi gặp nhau của ba cạnh: CD, DA và DD'.",
          "A'": "Đây là đỉnh A', nơi gặp nhau của ba cạnh: A'B', A'D' và AA'.",
          "B'": "Đây là đỉnh B', nơi gặp nhau của ba cạnh: A'B', B'C' và BB'.",
          "C'": "Đây là đỉnh C', nơi gặp nhau của ba cạnh: B'C', C'D' và CC'.",
          "D'": "Đây là đỉnh D', nơi gặp nhau của ba cạnh: C'D', D'A' và DD'."
        },
        "edges": {
          "AB": "Đây là cạnh AB, nối đỉnh A và B, dài bằng cạnh hình lập phương.",
          "BC": "Đây là cạnh BC, nối đỉnh B và C.",
          "CD": "Đây là cạnh CD, nối đỉnh C và D.",
          "DA": "Đây là cạnh DA, nối đỉnh D và A.",
          "AA'": "Đây là cạnh AA', nối đỉnh A và A', là cạnh bên.",
          "BB'": "Đây là cạnh BB', nối đỉnh B và B'.",
          "CC'": "Đây là cạnh CC', nối đỉnh C và C'.",
          "DD'": "Đây là cạnh DD', nối đỉnh D và D'.",
          "A'B'": "Đây là cạnh A'B', nối đỉnh A' và B'.",
          "B'C'": "Đây là cạnh B'C', nối đỉnh B' và C'.",
          "C'D'": "Đây là cạnh C'D', nối đỉnh C' và D'.",
          "D'A'": "Đây là cạnh D'A', nối đỉnh D' và A'."
        },
        "faces": {
          "ABCD": "Đây là mặt đáy dưới, là hình vuông có các cạnh AB, BC, CD, DA.",
          "A'B'C'D'": "Đây là mặt đáy trên, là hình vuông có các cạnh A'B', B'C', C'D', D'A'.",
          "ABB'A'": "Đây là mặt bên trước, là hình vuông có các cạnh AB, BB', B'A', A'A.",
          "BCC'B'": "Đây là mặt bên phải, là hình vuông có các cạnh BC, CC', C'B', B'B.",
          "CDD'C'": "Đây là mặt bên sau, là hình vuông có các cạnh CD, DD', D'C', C'C.",
          "DAA'D'": "Đây là mặt bên trái, là hình vuông có các cạnh DA, AA', A'D', D'D."
        }
      },
      "suggestedQuestions": [
        "Hình lập phương có bao nhiêu mặt, cạnh, đỉnh?",
        "Làm thế nào để tính thể tích hình lập phương khi biết cạnh?"
      ]
    },
    "rectangular_prism": {
      "nameVi": "Hình hộp chữ nhật",
      "type": "polyhedron",
      "level": "cap2",
      "parserKeywords": [
        "hình hộp chữ nhật",
        "hình hộp",
        "lăng trụ tứ giác",
        "rectangular prism"
      ],
      "fallbackSpec": {
        "shape": "rectangular_prism",
        "baseShape": "rectangle",
        "vertices": [
          "A",
          "B",
          "C",
          "D",
          "A1",
          "B1",
          "C1",
          "D1"
        ],
        "params": {
          "a": 1,
          "b": 1,
          "h": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 8,
        "edges": 12,
        "faces": 6,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = abh",
          "latex": "V = a \\cdot b \\cdot h"
        },
        "lateralArea": {
          "text": "Sxq = 2(a+b)h",
          "latex": "S_{xq} = 2(a+b)h"
        },
        "surfaceArea": {
          "text": "Stp = 2(ab+bh+ah)",
          "latex": "S_{tp} = 2(ab+bh+ah)"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có 6 mặt đều là hình chữ nhật.",
          "Có 8 đỉnh và 12 cạnh.",
          "Các mặt đối diện song song và bằng nhau.",
          "Ví dụ thực tế: hộp sữa, viên gạch, thùng carton."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh trái dưới trước",
              "B — đỉnh phải dưới trước",
              "C — đỉnh phải trên trước",
              "D — đỉnh trái trên trước",
              "A1 — đỉnh trái dưới sau",
              "B1 — đỉnh phải dưới sau",
              "C1 — đỉnh phải trên sau",
              "D1 — đỉnh trái trên sau"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy trước",
              "BC — cạnh đáy phải",
              "CD — cạnh đáy sau",
              "DA — cạnh đáy trái"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABCD — mặt đáy dưới",
              "A1B1C1D1 — mặt đáy trên"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường chéo",
            "description": "Đường chéo của hình hộp chữ nhật được tính bằng căn bậc hai của tổng bình phương ba kích thước.",
            "latex": "d = \\sqrt{a^2 + b^2 + h^2}"
          }
        ],
        "formulas": [
          {
            "title": "Thể tích",
            "description": "Thể tích bằng tích chiều dài, chiều rộng và chiều cao.",
            "latex": "V = a \\times b \\times h"
          },
          {
            "title": "Diện tích xung quanh",
            "description": "Diện tích xung quanh bằng chu vi đáy nhân chiều cao.",
            "latex": "S_{xq} = 2(a+b) \\times h"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Diện tích toàn phần bằng diện tích xung quanh cộng diện tích hai đáy.",
            "latex": "S_{tp} = S_{xq} + 2ab = 2(ab + bh + ah)"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, nơi gặp nhau của các cạnh AB, AD và AA1.",
          "B": "Đây là đỉnh B, nơi gặp nhau của các cạnh AB, BC và BB1.",
          "C": "Đây là đỉnh C, nơi gặp nhau của các cạnh BC, CD và CC1.",
          "D": "Đây là đỉnh D, nơi gặp nhau của các cạnh CD, DA và DD1.",
          "A1": "Đây là đỉnh A1, nơi gặp nhau của các cạnh A1B1, A1D1 và AA1.",
          "B1": "Đây là đỉnh B1, nơi gặp nhau của các cạnh A1B1, B1C1 và BB1.",
          "C1": "Đây là đỉnh C1, nơi gặp nhau của các cạnh B1C1, C1D1 và CC1.",
          "D1": "Đây là đỉnh D1, nơi gặp nhau của các cạnh C1D1, A1D1 và DD1."
        },
        "edges": {
          "AB": "Đây là cạnh AB, chiều dài a.",
          "BC": "Đây là cạnh BC, chiều rộng b.",
          "CD": "Đây là cạnh CD, chiều dài a.",
          "DA": "Đây là cạnh DA, chiều rộng b.",
          "AA1": "Đây là cạnh AA1, chiều cao h.",
          "BB1": "Đây là cạnh BB1, chiều cao h.",
          "CC1": "Đây là cạnh CC1, chiều cao h.",
          "DD1": "Đây là cạnh DD1, chiều cao h.",
          "A1B1": "Đây là cạnh A1B1, chiều dài a.",
          "B1C1": "Đây là cạnh B1C1, chiều rộng b.",
          "C1D1": "Đây là cạnh C1D1, chiều dài a.",
          "D1A1": "Đây là cạnh D1A1, chiều rộng b."
        },
        "faces": {
          "ABCD": "Đây là mặt đáy dưới, hình chữ nhật có kích thước a và b.",
          "A1B1C1D1": "Đây là mặt đáy trên, hình chữ nhật có kích thước a và b.",
          "ABB1A1": "Đây là mặt bên trước, hình chữ nhật có kích thước a và h.",
          "BCC1B1": "Đây là mặt bên phải, hình chữ nhật có kích thước b và h.",
          "CDD1C1": "Đây là mặt bên sau, hình chữ nhật có kích thước a và h.",
          "DAA1D1": "Đây là mặt bên trái, hình chữ nhật có kích thước b và h."
        }
      },
      "suggestedQuestions": [
        "Hãy kể tên một số đồ vật có dạng hình hộp chữ nhật trong lớp học.",
        "Nếu tăng chiều cao lên gấp đôi thì thể tích thay đổi thế nào?"
      ]
    },
    "triangular_prism": {
      "nameVi": "Lăng trụ tam giác",
      "type": "polyhedron",
      "level": "cap2",
      "parserKeywords": [
        "lăng trụ tam giác",
        "lăng trụ đứng tam giác",
        "triangular prism"
      ],
      "fallbackSpec": {
        "shape": "triangular_prism",
        "vertices": [
          "A",
          "B",
          "C",
          "A1",
          "B1",
          "C1"
        ],
        "params": {
          "a": 1,
          "h": 2
        },
        "conditions": []
      },
      "topology": {
        "vertices": 6,
        "edges": 9,
        "faces": 5,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = Sđáy × h",
          "latex": "V = S_{đáy} \\times h"
        },
        "lateralArea": {
          "text": "Sxq = chu vi đáy × h",
          "latex": "S_{xq} = C_{đáy} \\times h"
        },
        "surfaceArea": {
          "text": "Stp = Sxq + 2×Sđáy",
          "latex": "S_{tp} = S_{xq} + 2S_{đáy}"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai mặt đáy là hình tam giác bằng nhau.",
          "Các mặt bên là hình chữ nhật.",
          "Các cạnh bên song song và bằng nhau.",
          "Ví dụ thực tế: hộp quà hình lăng trụ tam giác, mái nhà."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh của mặt đáy trên",
              "B — đỉnh của mặt đáy trên",
              "C — đỉnh của mặt đáy trên",
              "A' — đỉnh của mặt đáy dưới",
              "B' — đỉnh của mặt đáy dưới",
              "C' — đỉnh của mặt đáy dưới"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy của tam giác trên",
              "BC — cạnh đáy của tam giác trên",
              "CA — cạnh đáy của tam giác trên",
              "A'B' — cạnh đáy của tam giác dưới",
              "B'C' — cạnh đáy của tam giác dưới",
              "C'A' — cạnh đáy của tam giác dưới"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABC — mặt đáy trên",
              "A'B'C' — mặt đáy dưới"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Thể tích lăng trụ tam giác",
            "description": "Thể tích bằng diện tích đáy nhân với chiều cao.",
            "latex": "V = S_{đáy} \\times h"
          }
        ],
        "formulas": [
          {
            "title": "Diện tích xung quanh",
            "description": "Diện tích xung quanh bằng chu vi đáy nhân chiều cao.",
            "latex": "S_{xq} = C_{đáy} \\times h"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Diện tích toàn phần bằng diện tích xung quanh cộng hai lần diện tích đáy.",
            "latex": "S_{tp} = S_{xq} + 2 \\times S_{đáy}"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một đỉnh của mặt đáy trên.",
          "B": "Đây là đỉnh B, một đỉnh của mặt đáy trên.",
          "C": "Đây là đỉnh C, một đỉnh của mặt đáy trên.",
          "A'": "Đây là đỉnh A', một đỉnh của mặt đáy dưới.",
          "B'": "Đây là đỉnh B', một đỉnh của mặt đáy dưới.",
          "C'": "Đây là đỉnh C', một đỉnh của mặt đáy dưới."
        },
        "edges": {
          "AB": "Đây là cạnh AB, một cạnh của mặt đáy trên.",
          "BC": "Đây là cạnh BC, một cạnh của mặt đáy trên.",
          "CA": "Đây là cạnh CA, một cạnh của mặt đáy trên.",
          "A'B'": "Đây là cạnh A'B', một cạnh của mặt đáy dưới.",
          "B'C'": "Đây là cạnh B'C', một cạnh của mặt đáy dưới.",
          "C'A'": "Đây là cạnh C'A', một cạnh của mặt đáy dưới.",
          "AA'": "Đây là cạnh bên AA' nối đỉnh A và A'.",
          "BB'": "Đây là cạnh bên BB' nối đỉnh B và B'.",
          "CC'": "Đây là cạnh bên CC' nối đỉnh C và C'."
        },
        "faces": {
          "ABC": "Đây là mặt đáy trên ABC, một hình tam giác.",
          "A'B'C'": "Đây là mặt đáy dưới A'B'C', một hình tam giác.",
          "ABB'A'": "Đây là mặt bên ABB'A', một hình chữ nhật.",
          "BCC'B'": "Đây là mặt bên BCC'B', một hình chữ nhật.",
          "CAA'C'": "Đây là mặt bên CAA'C', một hình chữ nhật."
        }
      },
      "suggestedQuestions": [
        "Lăng trụ tam giác có bao nhiêu mặt, đỉnh, cạnh?",
        "Làm thế nào để tính thể tích lăng trụ tam giác?"
      ]
    },
    "square_pyramid": {
      "nameVi": "Hình chóp tứ giác đều",
      "type": "polyhedron",
      "level": "cap2",
      "parserKeywords": [
        "hình chóp tứ giác",
        "hình chóp s.abcd",
        "chóp tứ giác đều",
        "hình chóp vuông"
      ],
      "fallbackSpec": {
        "shape": "square_pyramid",
        "apex": "S",
        "vertices": [
          "A",
          "B",
          "C",
          "D",
          "S"
        ],
        "params": {
          "a": 1,
          "h": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 5,
        "edges": 8,
        "faces": 5,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = (1/3)a²h",
          "latex": "V = \\dfrac{1}{3}a^2 h"
        },
        "lateralArea": {
          "text": "Sxq = 2al",
          "latex": "S_{xq} = 2al"
        },
        "surfaceArea": {
          "text": "Stp = a² + 2al",
          "latex": "S_{tp} = a^2 + 2al"
        }
      },
      "lessonContent": {
        "recognition": [
          "Đáy là hình vuông.",
          "Các mặt bên là tam giác cân bằng nhau.",
          "Các cạnh bên bằng nhau.",
          "Ví dụ thực tế: Kim tự tháp, chụp đèn hình chóp."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "S — đỉnh chóp, là điểm chung của các mặt bên",
              "A, B, C, D — các đỉnh của đáy"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy nối A và B",
              "BC — cạnh đáy nối B và C",
              "CD — cạnh đáy nối C và D",
              "DA — cạnh đáy nối D và A"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABCD — mặt đáy hình vuông"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Đường cao của hình chóp",
            "description": "Đường thẳng từ đỉnh vuông góc với mặt đáy, đi qua tâm đáy.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Thể tích",
            "description": "Thể tích bằng một phần ba diện tích đáy nhân chiều cao.",
            "latex": "V = \\frac{1}{3} a^2 h"
          },
          {
            "title": "Diện tích xung quanh",
            "description": "Diện tích xung quanh bằng nửa chu vi đáy nhân trung đoạn.",
            "latex": "S_{xq} = 2al"
          },
          {
            "title": "Diện tích toàn phần",
            "description": "Diện tích toàn phần bằng diện tích đáy cộng diện tích xung quanh.",
            "latex": "S_{tp} = a^2 + 2al"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "S": "Đây là đỉnh chóp S, nơi các mặt bên gặp nhau.",
          "A": "Đỉnh A của đáy hình vuông.",
          "B": "Đỉnh B của đáy hình vuông.",
          "C": "Đỉnh C của đáy hình vuông.",
          "D": "Đỉnh D của đáy hình vuông."
        },
        "edges": {
          "SA": "Cạnh bên SA nối đỉnh S với đỉnh A.",
          "SB": "Cạnh bên SB nối đỉnh S với đỉnh B.",
          "SC": "Cạnh bên SC nối đỉnh S với đỉnh C.",
          "SD": "Cạnh bên SD nối đỉnh S với đỉnh D.",
          "AB": "Cạnh đáy AB thuộc mặt đáy.",
          "BC": "Cạnh đáy BC thuộc mặt đáy.",
          "CD": "Cạnh đáy CD thuộc mặt đáy.",
          "DA": "Cạnh đáy DA thuộc mặt đáy."
        },
        "faces": {
          "ABCD": "Mặt đáy ABCD là hình vuông.",
          "SAB": "Mặt bên SAB là tam giác cân tại S.",
          "SBC": "Mặt bên SBC là tam giác cân tại S.",
          "SCD": "Mặt bên SCD là tam giác cân tại S.",
          "SDA": "Mặt bên SDA là tam giác cân tại S."
        }
      },
      "suggestedQuestions": [
        "Hình chóp tứ giác đều có bao nhiêu mặt, đỉnh, cạnh?",
        "Làm thế nào để tính thể tích hình chóp tứ giác đều?"
      ]
    },
    "triangular_pyramid": {
      "nameVi": "Hình chóp tam giác",
      "type": "polyhedron",
      "level": "cap2",
      "parserKeywords": [
        "hình chóp tam giác",
        "s.abc",
        "chóp tam giác",
        "triangular pyramid"
      ],
      "fallbackSpec": {
        "shape": "triangular_pyramid",
        "apex": "S",
        "vertices": [
          "A",
          "B",
          "C",
          "S"
        ],
        "params": {
          "a": 1,
          "h": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 6,
        "faces": 4,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = (1/3)Sđáy×h",
          "latex": "V = \\dfrac{1}{3}S_{đáy} \\cdot h"
        }
      },
      "lessonContent": {
        "recognition": [
          "Hình chóp tam giác có đáy là hình tam giác.",
          "Các mặt bên là hình tam giác chung một đỉnh.",
          "Có 4 mặt, 6 cạnh, 4 đỉnh.",
          "Ví dụ thực tế: Kim tự tháp Ai Cập có dạng hình chóp tứ giác, nhưng hình chóp tam giác cũng thường gặp trong các vật dụng như lều trại."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "S — đỉnh chóp, là điểm chung của các mặt bên.",
              "A, B, C — các đỉnh của đáy."
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy nối A và B.",
              "BC — cạnh đáy nối B và C.",
              "CA — cạnh đáy nối C và A."
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABC — mặt đáy là tam giác."
            ]
          }
        ],
        "theorems": [
          {
            "title": "Công thức thể tích hình chóp",
            "description": "Thể tích hình chóp bằng một phần ba diện tích đáy nhân với chiều cao.",
            "latex": "V = \\frac{1}{3} S_{đáy} \\times h"
          }
        ],
        "formulas": [
          {
            "title": "Thể tích hình chóp tam giác",
            "description": "Công thức tính thể tích hình chóp tam giác.",
            "latex": "V = \\frac{1}{3} S_{đáy} \\times h"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong ba đỉnh của mặt đáy tam giác.",
          "B": "Đây là đỉnh B, đỉnh thứ hai của mặt đáy.",
          "C": "Đây là đỉnh C, đỉnh thứ ba của mặt đáy.",
          "S": "Đây là đỉnh S, đỉnh chóp, là điểm chung của các mặt bên."
        },
        "edges": {
          "AB": "Đây là cạnh AB, cạnh đáy nối đỉnh A và B.",
          "BC": "Đây là cạnh BC, cạnh đáy nối đỉnh B và C.",
          "CA": "Đây là cạnh CA, cạnh đáy nối đỉnh C và A.",
          "SA": "Đây là cạnh SA, cạnh bên nối đỉnh S với A.",
          "SB": "Đây là cạnh SB, cạnh bên nối đỉnh S với B.",
          "SC": "Đây là cạnh SC, cạnh bên nối đỉnh S với C."
        },
        "faces": {
          "ABC": "Đây là mặt ABC, mặt đáy hình tam giác.",
          "SAB": "Đây là mặt SAB, mặt bên hình tam giác.",
          "SBC": "Đây là mặt SBC, mặt bên hình tam giác.",
          "SCA": "Đây là mặt SCA, mặt bên hình tam giác."
        }
      },
      "suggestedQuestions": [
        "Hình chóp tam giác có bao nhiêu mặt, cạnh, đỉnh?",
        "Làm thế nào để tính thể tích hình chóp tam giác?"
      ]
    },
    "point": {
      "nameVi": "Điểm",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "điểm",
        "point"
      ],
      "fallbackSpec": {
        "shape": "point",
        "vertices": [
          "A"
        ],
        "params": {},
        "conditions": []
      },
      "topology": {
        "vertices": 1,
        "edges": 0,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Điểm được kí hiệu bằng chữ cái in hoa.",
          "Điểm không có kích thước, chỉ có vị trí.",
          "Hai điểm phân biệt là hai điểm khác nhau.",
          "Ví dụ thực tế: chấm bi trên con xúc xắc, vị trí các thành phố trên bản đồ."
        ],
        "objects": [
          {
            "category": "Điểm",
            "items": [
              "A — một điểm trên giấy",
              "B — điểm thứ hai",
              "C — điểm thứ ba"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Qua hai điểm phân biệt",
            "description": "Có một và chỉ một đường thẳng đi qua hai điểm phân biệt.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Không có công thức",
            "description": "Điểm là đối tượng cơ bản, không có công thức tính diện tích hay thể tích.",
            "latex": ""
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là điểm A, một chấm nhỏ trên giấy.",
          "B": "Đây là điểm B, khác với điểm A.",
          "C": "Đây là điểm C, không nằm trên đường thẳng AB."
        },
        "edges": {},
        "faces": {}
      },
      "suggestedQuestions": [
        "Có thể vẽ được bao nhiêu đường thẳng đi qua một điểm?",
        "Qua hai điểm phân biệt vẽ được mấy đường thẳng?"
      ]
    },
    "segment": {
      "nameVi": "Đoạn thẳng",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "đoạn thẳng",
        "segment"
      ],
      "fallbackSpec": {
        "shape": "segment",
        "vertices": [
          "A",
          "B"
        ],
        "params": {
          "a": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 2,
        "edges": 1,
        "faces": 0,
        "euler": null
      },
      "formulas": {
        "perimeter": {
          "text": "AB = a",
          "latex": "AB = a"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai đầu mút là hai điểm.",
          "Là đường thẳng không bị cong.",
          "Có thể đo được độ dài.",
          "Ví dụ thực tế: cạnh bàn, cạnh sách, đường kẻ."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — một đầu mút của đoạn thẳng",
              "B — đầu mút còn lại"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — đoạn thẳng nối A và B"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "Không có mặt đáy vì đoạn thẳng chỉ có một chiều"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đoạn thẳng",
            "description": "Trong các đường nối hai điểm, đoạn thẳng là ngắn nhất.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Độ dài đoạn thẳng",
            "description": "Độ dài đoạn thẳng AB là khoảng cách giữa A và B.",
            "latex": "AB = a"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một đầu mút của đoạn thẳng.",
          "B": "Đây là đỉnh B, đầu mút còn lại của đoạn thẳng."
        },
        "edges": {
          "AB": "Đây là cạnh AB, đoạn thẳng nối hai điểm A và B."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một đoạn thẳng dài 7 cm?",
        "Đoạn thẳng có điểm gì khác so với đường thẳng?"
      ]
    },
    "line": {
      "nameVi": "Đường thẳng",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "đường thẳng",
        "line"
      ],
      "fallbackSpec": {
        "shape": "line",
        "vertices": [
          "A",
          "B"
        ],
        "params": {
          "a": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 2,
        "edges": 1,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Đường thẳng không có điểm đầu, điểm cuối.",
          "Đường thẳng có thể đặt tên bằng hai chữ cái in hoa (VD: AB) hoặc một chữ cái thường (VD: d).",
          "Mọi điểm trên đường thẳng đều thẳng hàng.",
          "Ví dụ thực tế: đường kẻ trên vở, sợi chỉ căng."
        ],
        "objects": [
          {
            "category": "Điểm",
            "items": [
              "A — một điểm trên đường thẳng",
              "B — một điểm khác trên đường thẳng"
            ]
          },
          {
            "category": "Đường thẳng",
            "items": [
              "AB — đường thẳng đi qua A và B"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tiên đề về đường thẳng",
            "description": "Qua hai điểm phân biệt chỉ có một đường thẳng duy nhất.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Không có công thức",
            "description": "Đường thẳng là khái niệm cơ bản, không có công thức tính toán.",
            "latex": ""
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là điểm A, một điểm trên đường thẳng.",
          "B": "Đây là điểm B, một điểm khác trên đường thẳng."
        },
        "edges": {
          "AB": "Đây là đường thẳng AB, đi qua hai điểm A và B."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Có thể vẽ được bao nhiêu đường thẳng đi qua một điểm?",
        "Làm thế nào để đặt tên cho một đường thẳng?"
      ]
    },
    "ray": {
      "nameVi": "Tia",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tia",
        "ray"
      ],
      "fallbackSpec": {
        "shape": "ray",
        "vertices": [
          "O",
          "A"
        ],
        "params": {
          "a": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 2,
        "edges": 1,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Tia có một điểm gốc và kéo dài vô tận về một phía.",
          "Tên tia gồm hai chữ cái: chữ đầu là gốc, chữ sau chỉ hướng (ví dụ: tia AB có gốc A).",
          "Tia không có độ dài, nhưng đoạn thẳng từ gốc đến một điểm trên tia thì có độ dài.",
          "Ví dụ thực tế: tia sáng từ đèn pin, tia nắng mặt trời."
        ],
        "objects": [
          {
            "category": "Điểm gốc",
            "items": [
              "A — điểm bắt đầu của tia"
            ]
          },
          {
            "category": "Điểm trên tia",
            "items": [
              "B — điểm xác định hướng của tia"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất tia",
            "description": "Mỗi tia chỉ có một điểm gốc duy nhất.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Không có công thức",
            "description": "Tia là khái niệm cơ bản, không có công thức tính toán.",
            "latex": ""
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là điểm gốc A của tia."
        },
        "edges": {
          "AB": "Đây là đoạn thẳng AB, nằm trên tia AB."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Tia khác với đường thẳng như thế nào?",
        "Có thể vẽ được bao nhiêu tia từ một điểm?",
        "Làm thế nào để đặt tên cho một tia?"
      ]
    },
    "angle": {
      "nameVi": "Góc",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "góc",
        "angle"
      ],
      "fallbackSpec": {
        "shape": "angle",
        "vertices": [
          "B",
          "A",
          "C"
        ],
        "params": {
          "a2": 60,
          "a": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 3,
        "edges": 2,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Hai tia chung gốc tạo thành góc.",
          "Góc nhọn nhỏ hơn 90°, góc vuông bằng 90°, góc tù lớn hơn 90° và nhỏ hơn 180°.",
          "Góc bẹt bằng 180° (hai tia đối nhau).",
          "Ví dụ thực tế: góc của bàn học, góc của cửa sổ."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "O — đỉnh chung của hai tia"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "Ox — một cạnh của góc",
              "Oy — cạnh còn lại"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tổng ba góc trong tam giác",
            "description": "Tổng số đo ba góc của một tam giác bằng 180°.",
            "latex": "\\angle A + \\angle B + \\angle C = 180^\\circ"
          }
        ],
        "formulas": [
          {
            "title": "Số đo góc",
            "description": "Góc được đo bằng độ, ký hiệu °.",
            "latex": "1^\\circ = \\frac{1}{180} \\text{ góc bẹt}"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "O": "Đây là đỉnh O, điểm chung của hai tia Ox và Oy."
        },
        "edges": {
          "Ox": "Đây là cạnh Ox, một tia xuất phát từ O.",
          "Oy": "Đây là cạnh Oy, tia còn lại tạo thành góc với Ox."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để đo một góc bằng thước đo góc?",
        "Góc vuông, góc nhọn, góc tù khác nhau thế nào?"
      ]
    },
    "triangle": {
      "nameVi": "Tam giác",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tam giác",
        "triangle"
      ],
      "fallbackSpec": {
        "shape": "triangle",
        "vertices": [
          "A",
          "B",
          "C"
        ],
        "params": {
          "a": 4,
          "b": 3,
          "h": 2.5
        },
        "conditions": []
      },
      "topology": {
        "vertices": 3,
        "edges": 3,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (1/2)×đáy×h",
          "latex": "S = \\frac{1}{2}ah"
        },
        "perimeter": {
          "text": "P = a+b+c",
          "latex": "P = a+b+c"
        }
      },
      "lessonContent": {
        "recognition": [
          "Hình có 3 cạnh, 3 đỉnh, 3 góc.",
          "Tổng ba góc bằng 180°.",
          "Có thể có góc vuông, góc nhọn hoặc góc tù.",
          "Ví dụ thực tế: cạnh bàn hình tam giác, lá cờ."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh thứ nhất",
              "B — đỉnh thứ hai",
              "C — đỉnh thứ ba"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh nối A và B",
              "BC — cạnh nối B và C",
              "CA — cạnh nối C và A"
            ]
          },
          {
            "category": "Góc",
            "items": [
              "∠A — góc tại đỉnh A",
              "∠B — góc tại đỉnh B",
              "∠C — góc tại đỉnh C"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tổng ba góc trong tam giác",
            "description": "Tổng số đo ba góc của một tam giác bằng 180°.",
            "latex": "\\angle A + \\angle B + \\angle C = 180^\\circ"
          }
        ],
        "formulas": [
          {
            "title": "Chu vi tam giác",
            "description": "Chu vi bằng tổng độ dài ba cạnh.",
            "latex": "P = a + b + c"
          },
          {
            "title": "Diện tích tam giác",
            "description": "Diện tích bằng một nửa tích của đáy và chiều cao.",
            "latex": "S = \\frac{1}{2} \\times \\text{đáy} \\times \\text{chiều cao}"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong ba đỉnh của tam giác.",
          "B": "Đây là đỉnh B, nối với A và C.",
          "C": "Đây là đỉnh C, nối với A và B."
        },
        "edges": {
          "AB": "Đây là cạnh AB, nối đỉnh A và B.",
          "BC": "Đây là cạnh BC, nối đỉnh B và C.",
          "CA": "Đây là cạnh CA, nối đỉnh C và A."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để phân biệt tam giác đều và tam giác cân?",
        "Nếu biết hai góc của tam giác, làm sao tìm góc còn lại?"
      ]
    },
    "equilateral_triangle": {
      "nameVi": "Tam giác đều",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tam giác đều",
        "equilateral triangle"
      ],
      "fallbackSpec": {
        "shape": "equilateral_triangle",
        "vertices": [
          "A",
          "B",
          "C"
        ],
        "params": {
          "a": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 3,
        "edges": 3,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (√3/4)a²",
          "latex": "S = \\frac{\\sqrt{3}}{4}a^2"
        },
        "perimeter": {
          "text": "P = 3a",
          "latex": "P = 3a"
        }
      },
      "lessonContent": {
        "recognition": [
          "Ba cạnh bằng nhau.",
          "Ba góc bằng nhau (mỗi góc 60°).",
          "Các đường cao, trung tuyến, phân giác trùng nhau.",
          "Ví dụ thực tế: biển báo giao thông hình tam giác đều."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh thứ nhất của tam giác",
              "B — đỉnh thứ hai",
              "C — đỉnh thứ ba"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh nối đỉnh A và B",
              "BC — cạnh nối đỉnh B và C",
              "CA — cạnh nối đỉnh C và A"
            ]
          },
          {
            "category": "Góc",
            "items": [
              "∠A — góc tại đỉnh A, bằng 60°",
              "∠B — góc tại đỉnh B, bằng 60°",
              "∠C — góc tại đỉnh C, bằng 60°"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất tam giác đều",
            "description": "Trong tam giác đều, ba cạnh bằng nhau và ba góc bằng 60 độ.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Chu vi tam giác đều",
            "description": "Chu vi bằng tổng độ dài ba cạnh, vì ba cạnh bằng nhau nên P = 3a.",
            "latex": "P = 3a"
          },
          {
            "title": "Diện tích tam giác đều",
            "description": "Diện tích bằng cạnh bình phương nhân căn ba phần tư.",
            "latex": "S = \\frac{\\sqrt{3}}{4} a^2"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong ba đỉnh của tam giác đều.",
          "B": "Đây là đỉnh B, đỉnh thứ hai của tam giác.",
          "C": "Đây là đỉnh C, đỉnh còn lại của tam giác."
        },
        "edges": {
          "AB": "Đây là cạnh AB, nối đỉnh A và B, có độ dài bằng a.",
          "BC": "Đây là cạnh BC, nối đỉnh B và C, có độ dài bằng a.",
          "CA": "Đây là cạnh CA, nối đỉnh C và A, có độ dài bằng a."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một tam giác đều chỉ bằng thước và compa?",
        "Nếu một tam giác đều có chu vi 12 cm, cạnh của nó dài bao nhiêu?"
      ]
    },
    "isosceles_triangle": {
      "nameVi": "Tam giác cân",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tam giác cân",
        "isosceles triangle"
      ],
      "fallbackSpec": {
        "shape": "isosceles_triangle",
        "vertices": [
          "A",
          "B",
          "C"
        ],
        "params": {
          "a": 6,
          "b": 5,
          "h": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 3,
        "edges": 3,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (1/2)×a×h",
          "latex": "S = \\frac{1}{2}ah"
        },
        "perimeter": {
          "text": "P = a+2b",
          "latex": "P = a+2b"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai cạnh bằng nhau.",
          "Có hai góc ở đáy bằng nhau.",
          "Đường cao, trung tuyến, phân giác từ đỉnh trùng nhau.",
          "Ví dụ thực tế: mái nhà, thước ê-ke, biển báo."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh chung của hai cạnh bên",
              "B — đỉnh thứ hai của cạnh đáy",
              "C — đỉnh thứ ba của cạnh đáy"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "BC — cạnh đáy nối B và C"
            ]
          },
          {
            "category": "Cạnh bên",
            "items": [
              "AB — cạnh bên thứ nhất",
              "AC — cạnh bên thứ hai"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất tam giác cân",
            "description": "Trong tam giác cân, hai góc ở đáy bằng nhau.",
            "latex": ""
          },
          {
            "title": "Đường cao đồng thời là trung tuyến",
            "description": "Đường cao từ đỉnh xuống đáy cũng là đường trung tuyến.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích",
            "description": "Diện tích bằng nửa tích cạnh đáy nhân chiều cao.",
            "latex": "S = \\frac{1}{2} \\times a \\times h"
          },
          {
            "title": "Chu vi",
            "description": "Chu vi bằng tổng cạnh đáy và hai lần cạnh bên.",
            "latex": "P = a + 2b"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, nơi hai cạnh bên gặp nhau.",
          "B": "Đây là đỉnh B, một đầu của cạnh đáy.",
          "C": "Đây là đỉnh C, đầu kia của cạnh đáy."
        },
        "edges": {
          "AB": "Đây là cạnh bên AB, bằng với cạnh AC.",
          "AC": "Đây là cạnh bên AC, bằng với cạnh AB.",
          "BC": "Đây là cạnh đáy BC."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một tam giác cân khi biết cạnh đáy và chiều cao?",
        "Nếu một tam giác có hai góc bằng nhau, có phải nó là tam giác cân không?"
      ]
    },
    "right_triangle": {
      "nameVi": "Tam giác vuông",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tam giác vuông",
        "right triangle"
      ],
      "fallbackSpec": {
        "shape": "right_triangle",
        "vertices": [
          "A",
          "B",
          "C"
        ],
        "params": {
          "a": 3,
          "b": 4
        },
        "conditions": [
          "góc A = 90°"
        ]
      },
      "topology": {
        "vertices": 3,
        "edges": 3,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (1/2)×a×b",
          "latex": "S = \\frac{1}{2}ab"
        },
        "perimeter": {
          "text": "P = a+b+c; c²=a²+b²",
          "latex": "P=a+b+c,\\;c^2=a^2+b^2"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có một góc vuông (90 độ).",
          "Có hai cạnh góc vuông vuông góc với nhau.",
          "Cạnh huyền là cạnh dài nhất, đối diện góc vuông.",
          "Ví dụ thực tế: thước ê-ke, góc tường, mái nhà."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh góc vuông",
              "B — đỉnh góc nhọn thứ nhất",
              "C — đỉnh góc nhọn thứ hai"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh góc vuông thứ nhất",
              "AC — cạnh góc vuông thứ hai",
              "BC — cạnh huyền"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Định lý Py-ta-go",
            "description": "Trong tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.",
            "latex": "BC^2 = AB^2 + AC^2"
          }
        ],
        "formulas": [
          {
            "title": "Diện tích tam giác vuông",
            "description": "Diện tích bằng một nửa tích hai cạnh góc vuông.",
            "latex": "S = \\frac{1}{2} \\times AB \\times AC"
          },
          {
            "title": "Chu vi tam giác vuông",
            "description": "Chu vi bằng tổng độ dài ba cạnh.",
            "latex": "P = AB + AC + BC"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, đỉnh của góc vuông.",
          "B": "Đây là đỉnh B, một đỉnh góc nhọn.",
          "C": "Đây là đỉnh C, đỉnh góc nhọn còn lại."
        },
        "edges": {
          "AB": "Đây là cạnh AB, một cạnh góc vuông.",
          "AC": "Đây là cạnh AC, cạnh góc vuông thứ hai.",
          "BC": "Đây là cạnh BC, cạnh huyền dài nhất."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để nhận biết một tam giác vuông?",
        "Công thức tính diện tích tam giác vuông là gì?",
        "Định lý Py-ta-go phát biểu thế nào?",
        "Hãy kể tên một số vật dụng có hình tam giác vuông trong đời sống."
      ]
    },
    "right_isosceles_triangle": {
      "nameVi": "Tam giác vuông cân",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "tam giác vuông cân",
        "right isosceles"
      ],
      "fallbackSpec": {
        "shape": "right_isosceles_triangle",
        "vertices": [
          "A",
          "B",
          "C"
        ],
        "params": {
          "a": 4
        },
        "conditions": [
          "góc A = 90°",
          "AB=AC"
        ]
      },
      "topology": {
        "vertices": 3,
        "edges": 3,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = a²/2",
          "latex": "S = \\frac{a^2}{2}"
        },
        "perimeter": {
          "text": "P = 2a+a√2",
          "latex": "P = 2a+a\\sqrt{2}"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có một góc vuông (90°).",
          "Hai cạnh góc vuông bằng nhau.",
          "Hai góc nhọn bằng nhau (45°).",
          "Ví dụ thực tế: thước ê-ke, miếng bánh chưng cắt đôi."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh góc vuông",
              "B — đỉnh góc nhọn thứ nhất",
              "C — đỉnh góc nhọn thứ hai"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh góc vuông thứ nhất",
              "AC — cạnh góc vuông thứ hai",
              "BC — cạnh huyền"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Định lý Pythagore",
            "description": "Trong tam giác vuông cân, bình phương cạnh huyền bằng hai lần bình phương cạnh góc vuông.",
            "latex": "BC^2 = AB^2 + AC^2 = 2a^2"
          }
        ],
        "formulas": [
          {
            "title": "Diện tích",
            "description": "Diện tích bằng một nửa tích hai cạnh góc vuông.",
            "latex": "S = \\frac{1}{2} a \\cdot a = \\frac{a^2}{2}"
          },
          {
            "title": "Chu vi",
            "description": "Chu vi bằng tổng hai cạnh góc vuông và cạnh huyền.",
            "latex": "P = a + a + a\\sqrt{2} = 2a + a\\sqrt{2}"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, nơi có góc vuông. Hai cạnh AB và AC gặp nhau tại A.",
          "B": "Đây là đỉnh B, một góc nhọn 45°.",
          "C": "Đây là đỉnh C, góc nhọn còn lại 45°."
        },
        "edges": {
          "AB": "Đây là cạnh AB, một cạnh góc vuông, dài bằng AC.",
          "AC": "Đây là cạnh AC, cạnh góc vuông thứ hai, bằng AB.",
          "BC": "Đây là cạnh huyền BC, dài nhất, đối diện góc vuông A."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một tam giác vuông cân chỉ bằng thước và compa?",
        "Nếu biết cạnh huyền, làm sao tính cạnh góc vuông?"
      ]
    },
    "rectangle": {
      "nameVi": "Hình chữ nhật",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình chữ nhật",
        "rectangle"
      ],
      "fallbackSpec": {
        "shape": "rectangle",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 6,
          "b": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = a×b",
          "latex": "S = a \\times b"
        },
        "perimeter": {
          "text": "P = 2(a+b)",
          "latex": "P = 2(a+b)"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có 4 góc vuông (90 độ).",
          "Các cạnh đối diện song song và bằng nhau.",
          "Hai đường chéo bằng nhau và cắt nhau tại trung điểm.",
          "Ví dụ thực tế: mặt bàn, quyển sách, tấm thảm."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh góc vuông thứ nhất",
              "B — đỉnh góc vuông thứ hai",
              "C — đỉnh góc vuông thứ ba",
              "D — đỉnh góc vuông thứ tư"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh đáy, dài a",
              "BC — cạnh bên, dài b",
              "CD — cạnh đáy, dài a",
              "DA — cạnh bên, dài b"
            ]
          },
          {
            "category": "Mặt",
            "items": [
              "ABCD — mặt phẳng hình chữ nhật"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường chéo",
            "description": "Hai đường chéo của hình chữ nhật bằng nhau và cắt nhau tại trung điểm mỗi đường.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Chu vi hình chữ nhật",
            "description": "Muốn tính chu vi, lấy tổng chiều dài và chiều rộng nhân với 2.",
            "latex": "P = 2(a + b)"
          },
          {
            "title": "Diện tích hình chữ nhật",
            "description": "Muốn tính diện tích, lấy chiều dài nhân với chiều rộng.",
            "latex": "S = a \\times b"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong bốn góc vuông của hình chữ nhật.",
          "B": "Đây là đỉnh B, nằm kề với A.",
          "C": "Đây là đỉnh C, đối diện với A.",
          "D": "Đây là đỉnh D, đối diện với B."
        },
        "edges": {
          "AB": "Đây là cạnh AB, chiều dài của hình chữ nhật.",
          "BC": "Đây là cạnh BC, chiều rộng của hình chữ nhật.",
          "CD": "Đây là cạnh CD, song song và bằng AB.",
          "DA": "Đây là cạnh DA, song song và bằng BC."
        },
        "faces": {
          "ABCD": "Đây là mặt ABCD, toàn bộ hình chữ nhật."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để nhận biết một hình là hình chữ nhật?",
        "Nếu biết chu vi và chiều dài, làm sao tìm chiều rộng?"
      ]
    },
    "square": {
      "nameVi": "Hình vuông",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình vuông",
        "square"
      ],
      "fallbackSpec": {
        "shape": "square",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 5
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = a²",
          "latex": "S = a^2"
        },
        "perimeter": {
          "text": "P = 4a",
          "latex": "P = 4a"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có 4 cạnh bằng nhau.",
          "Có 4 góc vuông.",
          "Hai đường chéo bằng nhau và cắt nhau tại trung điểm mỗi đường.",
          "Ví dụ thực tế: mặt bàn hình vuông, viên gạch lát nền."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh thứ nhất, thường đặt ở góc trên bên trái.",
              "B — đỉnh thứ hai, kề với A.",
              "C — đỉnh thứ ba, đối diện với A.",
              "D — đỉnh thứ tư, kề với A và C."
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh nối đỉnh A và B.",
              "BC — cạnh nối đỉnh B và C.",
              "CD — cạnh nối đỉnh C và D.",
              "DA — cạnh nối đỉnh D và A."
            ]
          },
          {
            "category": "Đường chéo",
            "items": [
              "AC — đường chéo nối đỉnh A và C.",
              "BD — đường chéo nối đỉnh B và D."
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường chéo",
            "description": "Hai đường chéo của hình vuông bằng nhau, vuông góc với nhau và cắt nhau tại trung điểm mỗi đường.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Chu vi hình vuông",
            "description": "Muốn tính chu vi hình vuông, ta lấy độ dài một cạnh nhân với 4.",
            "latex": "P = 4a"
          },
          {
            "title": "Diện tích hình vuông",
            "description": "Muốn tính diện tích hình vuông, ta lấy độ dài một cạnh nhân với chính nó.",
            "latex": "S = a^2"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong bốn góc của hình vuông.",
          "B": "Đây là đỉnh B, kề với đỉnh A.",
          "C": "Đây là đỉnh C, đối diện với đỉnh A.",
          "D": "Đây là đỉnh D, kề với đỉnh A và C."
        },
        "edges": {
          "AB": "Đây là cạnh AB, nối đỉnh A và B, dài bằng các cạnh khác.",
          "BC": "Đây là cạnh BC, nối đỉnh B và C.",
          "CD": "Đây là cạnh CD, nối đỉnh C và D.",
          "DA": "Đây là cạnh DA, nối đỉnh D và A."
        },
        "faces": {
          "ABCD": "Đây là mặt ABCD, toàn bộ hình vuông."
        }
      },
      "suggestedQuestions": [
        "Hình vuông có điểm gì giống và khác với hình chữ nhật?",
        "Làm thế nào để vẽ một hình vuông khi biết độ dài cạnh?",
        "Nếu tăng cạnh hình vuông lên gấp đôi thì diện tích thay đổi thế nào?"
      ]
    },
    "parallelogram": {
      "nameVi": "Hình bình hành",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình bình hành",
        "bình hành",
        "parallelogram"
      ],
      "fallbackSpec": {
        "shape": "parallelogram",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 5,
          "b": 4,
          "h": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = đáy×h",
          "latex": "S = a \\cdot h"
        },
        "perimeter": {
          "text": "P = 2(a+b)",
          "latex": "P = 2(a+b)"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai cặp cạnh đối song song.",
          "Các cạnh đối bằng nhau.",
          "Các góc đối bằng nhau.",
          "Ví dụ thực tế: mặt bàn hình bình hành, viên gạch lát nền."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh trái dưới",
              "B — đỉnh phải dưới",
              "C — đỉnh phải trên",
              "D — đỉnh trái trên"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — cạnh đáy dưới",
              "DC — cạnh đáy trên"
            ]
          },
          {
            "category": "Mặt đáy",
            "items": [
              "ABCD — mặt phẳng hình bình hành"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường chéo",
            "description": "Hai đường chéo cắt nhau tại trung điểm mỗi đường.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích",
            "description": "Diện tích bằng tích của cạnh đáy và chiều cao.",
            "latex": "S = a \\times h"
          },
          {
            "title": "Chu vi",
            "description": "Chu vi bằng tổng hai cạnh kề nhân 2.",
            "latex": "P = 2(a + b)"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, nằm ở góc trái dưới của hình bình hành.",
          "B": "Đây là đỉnh B, nằm ở góc phải dưới.",
          "C": "Đây là đỉnh C, nằm ở góc phải trên.",
          "D": "Đây là đỉnh D, nằm ở góc trái trên."
        },
        "edges": {
          "AB": "Đây là cạnh AB, cạnh đáy dưới.",
          "BC": "Đây là cạnh BC, cạnh bên phải.",
          "CD": "Đây là cạnh CD, cạnh đáy trên.",
          "DA": "Đây là cạnh DA, cạnh bên trái."
        },
        "faces": {
          "ABCD": "Đây là mặt ABCD, toàn bộ hình bình hành."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để nhận biết một tứ giác là hình bình hành?",
        "Nếu biết diện tích và chiều cao, làm sao tìm cạnh đáy?"
      ]
    },
    "rhombus": {
      "nameVi": "Hình thoi",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình thoi",
        "thoi",
        "rhombus"
      ],
      "fallbackSpec": {
        "shape": "rhombus",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 5,
          "h": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = d₁×d₂/2",
          "latex": "S = \\frac{d_1 d_2}{2}"
        },
        "perimeter": {
          "text": "P = 4a",
          "latex": "P = 4a"
        }
      },
      "lessonContent": {
        "recognition": [
          "Bốn cạnh bằng nhau.",
          "Hai đường chéo vuông góc.",
          "Hai đường chéo cắt nhau tại trung điểm mỗi đường.",
          "Ví dụ thực tế: mặt bàn hình thoi, con diều."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh trên cùng",
              "B — đỉnh bên trái",
              "C — đỉnh dưới cùng",
              "D — đỉnh bên phải"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "AB — cạnh nối A và B",
              "BC — cạnh nối B và C",
              "CD — cạnh nối C và D",
              "DA — cạnh nối D và A"
            ]
          },
          {
            "category": "Đường chéo",
            "items": [
              "AC — đường chéo nối A và C",
              "BD — đường chéo nối B và D"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường chéo",
            "description": "Hai đường chéo vuông góc và cắt nhau tại trung điểm mỗi đường.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích",
            "description": "Diện tích bằng nửa tích hai đường chéo.",
            "latex": "S = \\frac{d_1 \\times d_2}{2}"
          },
          {
            "title": "Chu vi",
            "description": "Chu vi bằng bốn lần độ dài cạnh.",
            "latex": "P = 4a"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một trong bốn đỉnh của hình thoi.",
          "B": "Đây là đỉnh B, kề với A và D.",
          "C": "Đây là đỉnh C, đối diện với A.",
          "D": "Đây là đỉnh D, kề với A và C."
        },
        "edges": {
          "AB": "Đây là cạnh AB, một trong bốn cạnh bằng nhau.",
          "BC": "Đây là cạnh BC, nối B và C.",
          "CD": "Đây là cạnh CD, nối C và D.",
          "DA": "Đây là cạnh DA, nối D và A."
        },
        "faces": {
          "ABCD": "Đây là mặt phẳng hình thoi ABCD."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để nhận biết một hình thoi?",
        "Công thức tính diện tích hình thoi là gì?"
      ]
    },
    "trapezoid": {
      "nameVi": "Hình thang",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình thang",
        "thang",
        "trapezoid"
      ],
      "fallbackSpec": {
        "shape": "trapezoid",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 8,
          "b": 5,
          "h": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (a+b)/2×h",
          "latex": "S = \\frac{(a+b)}{2}h"
        },
        "perimeter": {
          "text": "P = a+b+c+d",
          "latex": "P = a+b+c+d"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có một cặp cạnh đối song song.",
          "Hai cạnh đáy không bằng nhau (trừ trường hợp đặc biệt hình bình hành).",
          "Hai góc kề một cạnh bên có tổng bằng 180°.",
          "Ví dụ thực tế: mặt cắt của cái thang, mái nhà, túi xách."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh đầu của đáy lớn",
              "B — đỉnh cuối của đáy lớn",
              "C — đỉnh cuối của đáy bé",
              "D — đỉnh đầu của đáy bé"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — đáy lớn, song song với CD",
              "CD — đáy bé, song song với AB"
            ]
          },
          {
            "category": "Cạnh bên",
            "items": [
              "AD — cạnh bên trái",
              "BC — cạnh bên phải"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường trung bình",
            "description": "Đường trung bình của hình thang song song với hai đáy và bằng nửa tổng hai đáy.",
            "latex": "MN \\parallel AB \\parallel CD, MN = \\frac{AB+CD}{2}"
          }
        ],
        "formulas": [
          {
            "title": "Diện tích hình thang",
            "description": "Diện tích bằng nửa tích của tổng hai đáy với chiều cao.",
            "latex": "S = \\frac{(a+b) \\times h}{2}"
          },
          {
            "title": "Chu vi hình thang",
            "description": "Chu vi bằng tổng độ dài bốn cạnh.",
            "latex": "P = a + b + c + d"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một đầu của đáy lớn AB.",
          "B": "Đây là đỉnh B, đầu kia của đáy lớn AB.",
          "C": "Đây là đỉnh C, một đầu của đáy bé CD.",
          "D": "Đây là đỉnh D, đầu kia của đáy bé CD."
        },
        "edges": {
          "AB": "Đây là cạnh đáy lớn AB, song song với đáy bé CD.",
          "BC": "Đây là cạnh bên BC, nối đỉnh B và C.",
          "CD": "Đây là cạnh đáy bé CD, song song với AB.",
          "DA": "Đây là cạnh bên DA, nối đỉnh D và A."
        },
        "faces": {
          "ABCD": "Đây là mặt hình thang ABCD, có hai đáy AB và CD song song."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một hình thang có chiều cao 4 cm, đáy lớn 7 cm, đáy bé 3 cm?",
        "Hãy tìm trong lớp học một vật có dạng hình thang và đo các cạnh của nó."
      ]
    },
    "isosceles_trapezoid": {
      "nameVi": "Hình thang cân",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình thang cân",
        "thang cân",
        "isosceles trapezoid"
      ],
      "fallbackSpec": {
        "shape": "isosceles_trapezoid",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 8,
          "b": 4,
          "h": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 4,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (a+b)/2×h",
          "latex": "S = \\frac{(a+b)}{2}h"
        },
        "perimeter": {
          "text": "P = a+b+2c",
          "latex": "P = a+b+2c"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai cạnh bên bằng nhau",
          "Hai góc kề một đáy bằng nhau",
          "Hai đường chéo bằng nhau",
          "Ví dụ thực tế: mặt cắt của một cái thang xếp"
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "A — đỉnh trái của đáy lớn",
              "B — đỉnh phải của đáy lớn",
              "C — đỉnh phải của đáy nhỏ",
              "D — đỉnh trái của đáy nhỏ"
            ]
          },
          {
            "category": "Cạnh đáy",
            "items": [
              "AB — đáy lớn",
              "CD — đáy nhỏ"
            ]
          },
          {
            "category": "Cạnh bên",
            "items": [
              "AD — cạnh bên trái",
              "BC — cạnh bên phải"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất hình thang cân",
            "description": "Trong hình thang cân, hai cạnh bên bằng nhau, hai góc kề một đáy bằng nhau, hai đường chéo bằng nhau.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích",
            "description": "Diện tích bằng trung bình cộng hai đáy nhân chiều cao.",
            "latex": "S = \\frac{a+b}{2} \\times h"
          },
          {
            "title": "Chu vi",
            "description": "Chu vi bằng tổng hai đáy cộng hai lần cạnh bên.",
            "latex": "P = a + b + 2c"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là đỉnh A, một đầu của đáy lớn.",
          "B": "Đây là đỉnh B, đầu kia của đáy lớn.",
          "C": "Đây là đỉnh C, đầu phải của đáy nhỏ.",
          "D": "Đây là đỉnh D, đầu trái của đáy nhỏ."
        },
        "edges": {
          "AB": "Đây là cạnh AB, đáy lớn của hình thang.",
          "BC": "Đây là cạnh BC, cạnh bên phải.",
          "CD": "Đây là cạnh CD, đáy nhỏ.",
          "DA": "Đây là cạnh DA, cạnh bên trái."
        },
        "faces": {
          "ABCD": "Đây là mặt ABCD, hình thang cân."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để nhận biết một hình thang cân?",
        "Hãy kể tên một đồ vật có dạng hình thang cân trong lớp học."
      ]
    },
    "parallel_lines": {
      "nameVi": "Hai đường thẳng song song",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hai đường thẳng song song",
        "đường thẳng song song"
      ],
      "fallbackSpec": {
        "shape": "parallel_lines",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 5,
          "h": 2
        },
        "conditions": [
          "a//b"
        ]
      },
      "topology": {
        "vertices": 4,
        "edges": 2,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Hai đường thẳng không có điểm chung.",
          "Khoảng cách giữa chúng luôn không đổi.",
          "Nếu một đường thẳng cắt chúng tạo ra các cặp góc so le trong bằng nhau hoặc đồng vị bằng nhau.",
          "Ví dụ thực tế: đường ray tàu hỏa, các dòng kẻ trong vở."
        ],
        "objects": [
          {
            "category": "Đường thẳng",
            "items": [
              "a — đường thẳng thứ nhất",
              "b — đường thẳng thứ hai song song với a"
            ]
          },
          {
            "category": "Góc",
            "items": [
              "A1 — góc tại giao điểm của c và a",
              "B2 — góc so le trong với A1",
              "B1 — góc đồng vị với A1"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất hai đường thẳng song song",
            "description": "Nếu một đường thẳng cắt hai đường thẳng song song thì các góc so le trong bằng nhau và các góc đồng vị bằng nhau.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Ký hiệu song song",
            "description": "Ký hiệu hai đường thẳng song song: a // b.",
            "latex": "a \\parallel b"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {},
        "edges": {},
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để kiểm tra hai đường thẳng có song song không?",
        "Nếu một đường thẳng cắt hai đường thẳng song song, các góc tạo thành có quan hệ gì?"
      ]
    },
    "perpendicular_lines": {
      "nameVi": "Hai đường thẳng vuông góc",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hai đường thẳng vuông góc",
        "đường thẳng vuông góc"
      ],
      "fallbackSpec": {
        "shape": "perpendicular_lines",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 4
        },
        "conditions": [
          "a⊥b"
        ]
      },
      "topology": {
        "vertices": 4,
        "edges": 2,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Hai đường thẳng cắt nhau tạo thành góc 90°.",
          "Dùng ê-ke để kiểm tra: đặt ê-ke sao cho một cạnh trùng với một đường, cạnh kia trùng với đường còn lại.",
          "Ký hiệu: a ⟂ b.",
          "Ví dụ thực tế: các góc của bảng đen, khung cửa sổ."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "O — giao điểm của hai đường thẳng vuông góc"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "a — một đường thẳng",
              "b — đường thẳng vuông góc với a"
            ]
          },
          {
            "category": "Mặt",
            "items": [
              "Không có mặt, chỉ có hai đường thẳng"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường vuông góc",
            "description": "Qua một điểm cho trước, có duy nhất một đường thẳng vuông góc với một đường thẳng cho trước.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Ký hiệu vuông góc",
            "description": "Dùng ký hiệu ⟂ để chỉ hai đường thẳng vuông góc.",
            "latex": "a \\perp b"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "O": "Đây là điểm O, giao điểm của hai đường thẳng vuông góc."
        },
        "edges": {
          "a": "Đây là đường thẳng a.",
          "b": "Đây là đường thẳng b vuông góc với a."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ hai đường thẳng vuông góc bằng thước và ê-ke?",
        "Nếu một đường thẳng vuông góc với một trong hai đường thẳng song song thì nó có vuông góc với đường kia không?"
      ]
    },
    "perpendicular_bisector": {
      "nameVi": "Đường trung trực",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "đường trung trực",
        "trung trực"
      ],
      "fallbackSpec": {
        "shape": "perpendicular_bisector",
        "vertices": [
          "A",
          "B"
        ],
        "params": {
          "a": 4
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 2,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Đường thẳng vuông góc với đoạn thẳng tại trung điểm.",
          "Mọi điểm trên đường thẳng đó cách đều hai đầu mút.",
          "Có thể nhận biết bằng cách gấp giấy: nếp gấp là đường trung trực.",
          "Ví dụ thực tế: đường phân giác của một đoạn thẳng trên bản đồ."
        ],
        "objects": [
          {
            "category": "Đoạn thẳng",
            "items": [
              "AB — đoạn thẳng cần dựng đường trung trực"
            ]
          },
          {
            "category": "Trung điểm",
            "items": [
              "M — trung điểm của AB, là điểm nằm giữa và cách đều A và B"
            ]
          },
          {
            "category": "Đường trung trực",
            "items": [
              "d — đường thẳng vuông góc với AB tại M"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường trung trực",
            "description": "Điểm nằm trên đường trung trực của một đoạn thẳng thì cách đều hai đầu mút của đoạn thẳng đó.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Không có công thức tính toán",
            "description": "Đường trung trực là khái niệm hình học, không có công thức diện tích hay thể tích.",
            "latex": ""
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "A": "Đây là điểm A, một đầu mút của đoạn thẳng.",
          "B": "Đây là điểm B, đầu mút còn lại của đoạn thẳng."
        },
        "edges": {
          "AB": "Đây là đoạn thẳng AB, có độ dài xác định."
        },
        "faces": {
          "d": "Đây là đường trung trực của đoạn thẳng AB."
        }
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ đường trung trực của một đoạn thẳng chỉ bằng thước và compa?",
        "Nếu một điểm cách đều hai đầu mút của đoạn thẳng thì điểm đó có nằm trên đường trung trực không?"
      ]
    },
    "angle_bisector": {
      "nameVi": "Đường phân giác",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "đường phân giác",
        "phân giác"
      ],
      "fallbackSpec": {
        "shape": "angle_bisector",
        "vertices": [
          "B",
          "A",
          "C"
        ],
        "params": {
          "a2": 60,
          "a": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 3,
        "faces": 0,
        "euler": null
      },
      "formulas": {},
      "lessonContent": {
        "recognition": [
          "Tia nằm giữa hai cạnh của góc và tạo với hai cạnh hai góc bằng nhau.",
          "Có thể nhận biết bằng cách đo góc hoặc dùng compa dựng hình.",
          "Trong tam giác, ba đường phân giác đồng quy tại một điểm gọi là tâm đường tròn nội tiếp.",
          "Ví dụ thực tế: Khi gấp đôi một tờ giấy hình chữ nhật theo đường chéo, nếp gấp là đường phân giác của góc ở đỉnh."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "O — đỉnh của góc, nơi xuất phát tia phân giác"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "Ox — một cạnh của góc",
              "Oy — cạnh còn lại của góc"
            ]
          },
          {
            "category": "Tia phân giác",
            "items": [
              "Oz — tia phân giác nằm giữa Ox và Oy"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tính chất đường phân giác của một góc",
            "description": "Mọi điểm nằm trên tia phân giác của một góc thì cách đều hai cạnh của góc đó.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Công thức tính góc khi có tia phân giác",
            "description": "Nếu Oz là tia phân giác của góc xOy thì góc xOz = góc zOy = 1/2 góc xOy.",
            "latex": "\\angle xOz = \\angle zOy = \\frac{1}{2} \\angle xOy"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "O": "Đây là đỉnh O, nơi hai cạnh của góc gặp nhau và tia phân giác xuất phát."
        },
        "edges": {
          "Ox": "Đây là cạnh Ox, một trong hai cạnh của góc.",
          "Oy": "Đây là cạnh Oy, cạnh còn lại của góc."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ đường phân giác của một góc bằng thước đo góc?",
        "Nếu một góc có số đo 120°, tia phân giác tạo thành hai góc bao nhiêu độ?",
        "Trong tam giác, ba đường phân giác có tính chất gì đặc biệt?"
      ]
    },
    "circle": {
      "nameVi": "Đường tròn",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "đường tròn",
        "hình tròn",
        "circle"
      ],
      "fallbackSpec": {
        "shape": "circle",
        "vertices": [
          "O"
        ],
        "params": {
          "r": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 1,
        "edges": 0,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = πr²",
          "latex": "S = \\pi r^2"
        },
        "perimeter": {
          "text": "C = 2πr",
          "latex": "C = 2\\pi r"
        }
      },
      "lessonContent": {
        "recognition": [
          "Hình tròn có tâm và bán kính.",
          "Mọi điểm trên đường tròn cách đều tâm.",
          "Đường kính gấp đôi bán kính.",
          "Ví dụ thực tế: bánh xe, đồng hồ, nắp chai."
        ],
        "objects": [
          {
            "category": "Tâm",
            "items": [
              "O — điểm cố định ở giữa đường tròn"
            ]
          },
          {
            "category": "Bán kính",
            "items": [
              "OA — đoạn thẳng nối tâm O với điểm A trên đường tròn"
            ]
          },
          {
            "category": "Đường kính",
            "items": [
              "AB — đoạn thẳng đi qua tâm O, nối hai điểm A và B trên đường tròn"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Đường kính và dây cung",
            "description": "Đường kính là dây cung lớn nhất của đường tròn.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Chu vi hình tròn",
            "description": "Chu vi bằng 2 lần bán kính nhân với π.",
            "latex": "C = 2\\pi r"
          },
          {
            "title": "Diện tích hình tròn",
            "description": "Diện tích bằng bán kính bình phương nhân với π.",
            "latex": "S = \\pi r^2"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "O": "Đây là tâm O, điểm cố định ở giữa đường tròn.",
          "A": "Đây là điểm A nằm trên đường tròn.",
          "B": "Đây là điểm B nằm trên đường tròn, đối diện với A qua tâm."
        },
        "edges": {
          "OA": "Đây là bán kính OA, nối tâm O với điểm A.",
          "OB": "Đây là bán kính OB, nối tâm O với điểm B.",
          "AB": "Đây là đường kính AB, đi qua tâm O và nối hai điểm A, B."
        },
        "faces": {}
      },
      "suggestedQuestions": [
        "Làm thế nào để vẽ một đường tròn khi biết bán kính?",
        "Nếu tăng bán kính lên gấp đôi thì chu vi và diện tích thay đổi thế nào?"
      ]
    },
    "sector": {
      "nameVi": "Hình quạt tròn",
      "type": "flat",
      "level": "cap2",
      "visible": false,
      "parserKeywords": [
        "hình quạt",
        "hình quạt tròn",
        "sector"
      ],
      "fallbackSpec": {
        "shape": "sector",
        "vertices": [
          "O"
        ],
        "params": {
          "r": 4,
          "a2": 90
        },
        "conditions": []
      },
      "topology": {
        "vertices": 1,
        "edges": 2,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "area": {
          "text": "S = (α/360)×πr²",
          "latex": "S = \\frac{\\alpha}{360}\\pi r^2"
        },
        "perimeter": {
          "text": "l = (α/360)×2πr",
          "latex": "l = \\frac{\\alpha}{360} \\cdot 2\\pi r"
        }
      },
      "lessonContent": {
        "recognition": [
          "Có hai cạnh là bán kính của hình tròn.",
          "Có một cung tròn nối hai đầu bán kính.",
          "Góc ở tâm là góc giữa hai bán kính.",
          "Ví dụ thực tế: lát bánh pizza, miếng dưa hấu."
        ],
        "objects": [
          {
            "category": "Đỉnh",
            "items": [
              "O — tâm của hình tròn, là đỉnh của góc ở tâm",
              "A — một đầu mút của cung",
              "B — đầu mút còn lại của cung"
            ]
          },
          {
            "category": "Cạnh",
            "items": [
              "OA — bán kính thứ nhất",
              "OB — bán kính thứ hai",
              "AB — cung tròn (không phải đoạn thẳng)"
            ]
          },
          {
            "category": "Mặt",
            "items": [
              "Phần giới hạn bởi OA, OB và cung AB — đó là hình quạt tròn"
            ]
          }
        ],
        "theorems": [
          {
            "title": "Tỉ lệ góc",
            "description": "Diện tích và độ dài cung tỉ lệ thuận với góc ở tâm.",
            "latex": ""
          }
        ],
        "formulas": [
          {
            "title": "Diện tích hình quạt tròn",
            "description": "Diện tích bằng (góc/360) nhân diện tích hình tròn.",
            "latex": "S = \\frac{\\alpha}{360} \\pi r^2"
          },
          {
            "title": "Độ dài cung tròn",
            "description": "Độ dài cung bằng (góc/360) nhân chu vi hình tròn.",
            "latex": "l = \\frac{\\alpha}{360} \\cdot 2\\pi r"
          }
        ]
      },
      "objectDescriptions": {
        "vertices": {
          "O": "Đây là tâm O, nơi hai bán kính xuất phát.",
          "A": "Đây là điểm A, một đầu của cung tròn.",
          "B": "Đây là điểm B, đầu kia của cung tròn."
        },
        "edges": {
          "OA": "Đây là bán kính OA, nối tâm O với điểm A.",
          "OB": "Đây là bán kính OB, nối tâm O với điểm B.",
          "AB": "Đây là cung tròn AB, nối A và B."
        },
        "faces": {
          "OAB": "Đây là mặt hình quạt tròn, giới hạn bởi OA, OB và cung AB."
        }
      },
      "suggestedQuestions": [
        "Nếu góc ở tâm gấp đôi thì diện tích hình quạt thay đổi thế nào?",
        "Làm thế nào để vẽ một hình quạt tròn có diện tích bằng 1/4 hình tròn?"
      ]
    },
    "tetrahedron": {
      "nameVi": "Tứ diện đều",
      "type": "polyhedron",
      "level": "cap3",
      "visible": false,
      "parserKeywords": [
        "tứ diện đều",
        "tứ diện",
        "tetrahedron"
      ],
      "fallbackSpec": {
        "shape": "tetrahedron",
        "vertices": [
          "A",
          "B",
          "C",
          "D"
        ],
        "params": {
          "a": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 4,
        "edges": 6,
        "faces": 4,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = a³/(6√2)",
          "latex": "V = \\dfrac{a^3}{6\\sqrt{2}}"
        },
        "surfaceArea": {
          "text": "Stp = a²√3",
          "latex": "S_{tp} = a^2\\sqrt{3}"
        }
      },
      "suggestedQuestions": []
    },
    "general_pyramid": {
      "nameVi": "Hình chóp tổng quát",
      "type": "polyhedron",
      "level": "cap3",
      "visible": false,
      "parserKeywords": [
        "hình chóp",
        "chóp tổng quát",
        "general pyramid"
      ],
      "fallbackSpec": {
        "shape": "general_pyramid",
        "baseShape": "square",
        "apex": "S",
        "vertices": [
          "A",
          "B",
          "C",
          "D",
          "S"
        ],
        "params": {
          "a": 1,
          "h": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 5,
        "edges": 8,
        "faces": 5,
        "euler": 2
      },
      "formulas": {
        "volume": {
          "text": "V = (1/3)Sđáy×h",
          "latex": "V = \\dfrac{1}{3}S_{đáy} \\times h"
        }
      },
      "suggestedQuestions": []
    },
    "hyperboloid": {
      "nameVi": "Mặt hyperboloid một tầng",
      "type": "curved",
      "level": "cap3",
      "visible": false,
      "parserKeywords": [
        "hyperboloid",
        "mặt hyperboloid",
        "hyperboloid một tầng"
      ],
      "fallbackSpec": {
        "shape": "hyperboloid",
        "vertices": [
          "O"
        ],
        "params": {
          "a": 2,
          "h": 1
        },
        "conditions": []
      },
      "topology": {
        "vertices": 0,
        "edges": 0,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "volume": {
          "text": "x²/a² + y²/b² − z²/c² = 1",
          "latex": "\\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2} - \\dfrac{z^2}{c^2} = 1"
        }
      },
      "suggestedQuestions": []
    },
    "paraboloid": {
      "nameVi": "Mặt paraboloid elliptic",
      "type": "curved",
      "level": "cap3",
      "visible": false,
      "parserKeywords": [
        "paraboloid",
        "mặt paraboloid",
        "paraboloid elliptic"
      ],
      "fallbackSpec": {
        "shape": "paraboloid",
        "vertices": [
          "O"
        ],
        "params": {
          "a": 2,
          "h": 3
        },
        "conditions": []
      },
      "topology": {
        "vertices": 0,
        "edges": 0,
        "faces": 1,
        "euler": null
      },
      "formulas": {
        "volume": {
          "text": "z = x²/a² + y²/b²",
          "latex": "z = \\dfrac{x^2}{a^2} + \\dfrac{y^2}{b^2}"
        }
      },
      "suggestedQuestions": []
    }
  },
  "examples": [
    {
      "id": "rectangular-prism-basic",
      "shapeKey": "rectangular_prism",
      "title": "Hình hộp chữ nhật",
      "description": "Dài 5 cm, rộng 3 cm, cao 4 cm — nhận biết và đếm mặt, cạnh, đỉnh",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Hình hộp chữ nhật có chiều dài 5 cm, chiều rộng 3 cm và chiều cao 4 cm.",
      "params": {
        "a": 5,
        "b": 3,
        "h": 4
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "cube-basic",
      "shapeKey": "cube",
      "title": "Hình lập phương",
      "description": "Cạnh 4 cm — nhận biết và đếm mặt, cạnh, đỉnh",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Hình lập phương có cạnh 4 cm.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "rectangular-prism-volume-lop6",
      "shapeKey": "rectangular_prism",
      "title": "Thể tích hộp chữ nhật",
      "description": "Hộp dài 6 cm, rộng 4 cm, cao 3 cm — tính thể tích",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Hình hộp chữ nhật có chiều dài 6 cm, chiều rộng 4 cm, chiều cao 3 cm. Tính thể tích.",
      "params": {
        "a": 6,
        "b": 4,
        "h": 3
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "cube-volume-lop6",
      "shapeKey": "cube",
      "title": "Thể tích hình lập phương",
      "description": "Cạnh 3 cm — tính thể tích",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Hình lập phương có cạnh 3 cm. Tính thể tích.",
      "params": {
        "a": 3
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "rectangular-prism-aquarium",
      "shapeKey": "rectangular_prism",
      "title": "Bể cá hình hộp chữ nhật",
      "description": "Bể dài 50 cm, rộng 25 cm, cao 30 cm — tính thể tích nước",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Bể cá hình hộp chữ nhật có chiều dài 50 cm, chiều rộng 25 cm, chiều cao 30 cm. Tính thể tích bể.",
      "params": {
        "a": 50,
        "b": 25,
        "h": 30
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "cube-surface-lop6",
      "shapeKey": "cube",
      "title": "Diện tích hình lập phương",
      "description": "Cạnh 5 cm — tính diện tích toàn phần",
      "level": "intermediate",
      "grade": "lop6",
      "prompt": "Hình lập phương có cạnh 5 cm. Tính diện tích toàn phần.",
      "params": {
        "a": 5
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "triangular-prism-right-angle",
      "shapeKey": "triangular_prism",
      "title": "Lăng trụ đứng đáy tam giác vuông",
      "description": "Đáy ABC vuông tại A: AB = 3 cm, AC = 4 cm, chiều cao 5 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Lăng trụ đứng ABC.A'B'C' có đáy là tam giác vuông tại A, AB = 3 cm, AC = 4 cm. Chiều cao AA' = 5 cm.",
      "params": {
        "a": 3,
        "b": 4,
        "h": 5
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "triangular-prism-equilateral",
      "shapeKey": "triangular_prism",
      "title": "Lăng trụ đứng đáy tam giác đều",
      "description": "Đáy ABC đều cạnh 4 cm, chiều cao 6 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác đều cạnh 4 cm. Chiều cao AA' = 6 cm.",
      "params": {
        "a": 4,
        "h": 6
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "rectangular-prism-prism-lop7",
      "shapeKey": "rectangular_prism",
      "title": "Lăng trụ đứng đáy hình chữ nhật",
      "description": "Đáy chữ nhật 6×4 cm, chiều cao 5 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Lăng trụ đứng có đáy là hình chữ nhật dài 6 cm, rộng 4 cm. Chiều cao 5 cm.",
      "params": {
        "a": 6,
        "b": 4,
        "h": 5
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "triangular-prism-surface-lop7",
      "shapeKey": "triangular_prism",
      "title": "Lăng trụ đứng — tính diện tích toàn phần",
      "description": "Đáy tam giác đều cạnh 5 cm, chiều cao 8 cm",
      "level": "intermediate",
      "grade": "lop7",
      "prompt": "Lăng trụ đứng có đáy là tam giác đều cạnh 5 cm, chiều cao 8 cm. Tính diện tích toàn phần và thể tích.",
      "params": {
        "a": 5,
        "h": 8
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "triangular-prism-house",
      "shapeKey": "triangular_prism",
      "title": "Mái nhà dạng lăng trụ tam giác",
      "description": "Đáy tam giác đều cạnh 6 m, chiều dài mái 8 m",
      "level": "intermediate",
      "grade": "lop7",
      "prompt": "Mái nhà dạng lăng trụ đứng, đáy tam giác đều cạnh 6 m, chiều dài mái 8 m.",
      "params": {
        "a": 6,
        "h": 8
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "rectangular-prism-storage",
      "shapeKey": "rectangular_prism",
      "title": "Thùng hàng lăng trụ tứ giác",
      "description": "Dài 80 cm, rộng 50 cm, cao 60 cm",
      "level": "intermediate",
      "grade": "lop7",
      "prompt": "Thùng hàng dạng lăng trụ đứng đáy hình chữ nhật: dài 80 cm, rộng 50 cm, cao 60 cm.",
      "params": {
        "a": 80,
        "b": 50,
        "h": 60
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "square-pyramid-standard",
      "shapeKey": "square_pyramid",
      "title": "Hình chóp tứ giác đều S.ABCD",
      "description": "Đáy vuông cạnh 6 cm, chiều cao 4 cm",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Hình chóp tứ giác đều S.ABCD: đáy ABCD hình vuông cạnh 6 cm, chiều cao SO = 4 cm.",
      "params": {
        "a": 6,
        "h": 4
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "triangular-pyramid-standard",
      "shapeKey": "triangular_pyramid",
      "title": "Hình chóp tam giác đều S.ABC",
      "description": "Đáy ABC đều cạnh 4 cm, chiều cao SO = 3 cm",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Hình chóp tam giác đều S.ABC: đáy ABC tam giác đều cạnh 4 cm, chiều cao SO = 3 cm.",
      "params": {
        "a": 4,
        "h": 3
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "square-pyramid-lateral",
      "shapeKey": "square_pyramid",
      "title": "Hình chóp S.ABCD — tính đường trung đoạn",
      "description": "Đáy vuông 4 cm, chiều cao 3 cm — tính S xung quanh",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Hình chóp tứ giác đều S.ABCD: đáy vuông cạnh 4 cm, chiều cao 3 cm. Tính đường trung đoạn, diện tích xung quanh và thể tích.",
      "params": {
        "a": 4,
        "h": 3
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "triangular-pyramid-apothem",
      "shapeKey": "triangular_pyramid",
      "title": "Hình chóp S.ABC — đáy 6 cm, cao 4 cm",
      "description": "Đáy tam giác đều cạnh 6 cm, chiều cao 4 cm",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Hình chóp tam giác đều S.ABC: đáy tam giác đều cạnh 6 cm, chiều cao SO = 4 cm. Tính đường trung đoạn, diện tích xung quanh và thể tích.",
      "params": {
        "a": 6,
        "h": 4
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "square-pyramid-roof",
      "shapeKey": "square_pyramid",
      "title": "Mái nhà dạng hình chóp tứ giác",
      "description": "Đáy vuông 8 m, cao 3 m — tính diện tích lợp mái",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Mái nhà hình chóp tứ giác đều: đáy vuông cạnh 8 m, chiều cao 3 m. Tính diện tích cần lợp mái.",
      "params": {
        "a": 8,
        "h": 3
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "triangular-pyramid-sand",
      "shapeKey": "triangular_pyramid",
      "title": "Đống cát hình chóp tam giác",
      "description": "Đáy đều cạnh 3 m, cao 2 m — tính thể tích",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Đống cát dạng hình chóp tam giác đều: đáy tam giác đều cạnh 3 m, chiều cao 2 m. Tính thể tích.",
      "params": {
        "a": 3,
        "h": 2
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "cylinder-basic",
      "shapeKey": "cylinder",
      "title": "Hình trụ tròn xoay",
      "description": "Bán kính r = 3 cm, chiều cao h = 6 cm",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Hình trụ tròn xoay có bán kính đáy r = 3 cm và chiều cao h = 6 cm.",
      "params": {
        "r": 3,
        "h": 6
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "cone-basic",
      "shapeKey": "cone",
      "title": "Hình nón tròn xoay",
      "description": "Bán kính r = 3 cm, chiều cao h = 4 cm",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Hình nón tròn xoay: bán kính r = 3 cm, chiều cao h = 4 cm.",
      "params": {
        "r": 3,
        "h": 4
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "sphere-basic",
      "shapeKey": "sphere",
      "title": "Hình cầu",
      "description": "Bán kính R = 5 cm",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Hình cầu tâm O, bán kính R = 5 cm. Tính diện tích mặt cầu và thể tích.",
      "params": {
        "r": 5
      },
      "givenParams": [
        "r"
      ]
    },
    {
      "id": "cylinder-can",
      "shapeKey": "cylinder",
      "title": "Lon nước dạng hình trụ",
      "description": "r = 4 cm, h = 10 cm — tính thể tích và diện tích tôn",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Lon nước hình trụ: r = 4 cm, h = 10 cm. Tính thể tích nước và diện tích tôn làm lon.",
      "params": {
        "r": 4,
        "h": 10
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "cone-icecream",
      "shapeKey": "cone",
      "title": "Ốc quế kem hình nón",
      "description": "r = 2 cm, h = 8 cm — tính thể tích kem",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Ốc quế kem hình nón: r = 2 cm, h = 8 cm. Tính thể tích kem chứa được.",
      "params": {
        "r": 2,
        "h": 8
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "cone-hat",
      "shapeKey": "cone",
      "title": "Nón lá dạng hình nón",
      "description": "r = 20 cm, h = 30 cm — tính diện tích vải",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Nón lá hình nón: r = 20 cm, h = 30 cm. Tính đường sinh và diện tích vải may nón.",
      "params": {
        "r": 20,
        "h": 30
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "sphere-ball",
      "shapeKey": "sphere",
      "title": "Quả bóng đá",
      "description": "R = 11 cm — tính diện tích da và thể tích",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Quả bóng đá hình cầu bán kính R = 11 cm. Tính diện tích da bọc và thể tích không khí bên trong.",
      "params": {
        "r": 11
      },
      "givenParams": [
        "r"
      ]
    },
    {
      "id": "cylinder-pool",
      "shapeKey": "cylinder",
      "title": "Bể bơi hình trụ",
      "description": "r = 5 m, sâu 1,5 m — tính thể tích nước",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Bể bơi hình trụ tròn: r = 5 m, h = 1,5 m. Tính thể tích nước cần đổ đầy bể.",
      "params": {
        "r": 5,
        "h": 1.5
      },
      "givenParams": [
        "r",
        "h"
      ]
    },
    {
      "id": "sphere-earth",
      "shapeKey": "sphere",
      "title": "Mô hình Trái Đất",
      "description": "R = 6371 km — tính diện tích bề mặt",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Trái Đất xấp xỉ hình cầu, R ≈ 6371 km. Tính diện tích bề mặt và thể tích Trái Đất.",
      "params": {
        "r": 6371
      },
      "givenParams": [
        "r"
      ]
    },
    {
      "id": "point-basic",
      "shapeKey": "point",
      "title": "Điểm A",
      "description": "Nhận biết và ký hiệu điểm",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ điểm A trong mặt phẳng.",
      "params": {}
    },
    {
      "id": "segment-basic",
      "shapeKey": "segment",
      "title": "Đoạn thẳng AB = 5 cm",
      "description": "Đoạn thẳng AB = 5 cm",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ đoạn thẳng AB = 5 cm.",
      "params": {
        "a": 5
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "line-basic",
      "shapeKey": "line",
      "title": "Đường thẳng AB",
      "description": "Đường thẳng qua A và B",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ đường thẳng qua hai điểm A và B.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "ray-basic",
      "shapeKey": "ray",
      "title": "Tia Ox",
      "description": "Tia gốc O qua điểm A",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ tia Ox gốc O qua A.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "angle-60",
      "shapeKey": "angle",
      "title": "Góc 60°",
      "description": "Góc nhọn BAC = 60°",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ góc BAC = 60°.",
      "params": {
        "a2": 60,
        "a": 3
      },
      "givenParams": [
        "a2"
      ]
    },
    {
      "id": "angle-90",
      "shapeKey": "angle",
      "title": "Góc vuông 90°",
      "description": "Góc vuông BAC = 90°",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ góc vuông BAC = 90°.",
      "params": {
        "a2": 90,
        "a": 3
      },
      "givenParams": [
        "a2"
      ]
    },
    {
      "id": "triangle-basic",
      "shapeKey": "triangle",
      "title": "Tam giác ABC",
      "description": "Tam giác ABC ba cạnh",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ tam giác ABC.",
      "params": {
        "a": 4,
        "b": 3,
        "h": 2.5
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "equilateral-triangle-basic",
      "shapeKey": "equilateral_triangle",
      "title": "Tam giác đều cạnh 4 cm",
      "description": "Tam giác đều ABC cạnh 4 cm",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ tam giác đều ABC cạnh 4 cm.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "rectangle-basic",
      "shapeKey": "rectangle",
      "title": "Hình chữ nhật 6×4 cm",
      "description": "Hình chữ nhật ABCD dài 6, rộng 4",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ hình chữ nhật ABCD dài 6 cm, rộng 4 cm.",
      "params": {
        "a": 6,
        "b": 4
      },
      "givenParams": [
        "a",
        "b"
      ]
    },
    {
      "id": "square-basic",
      "shapeKey": "square",
      "title": "Hình vuông cạnh 5 cm",
      "description": "Hình vuông ABCD cạnh 5 cm",
      "level": "basic",
      "grade": "lop6",
      "prompt": "Vẽ hình vuông ABCD cạnh 5 cm.",
      "params": {
        "a": 5
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "isosceles-triangle-basic",
      "shapeKey": "isosceles_triangle",
      "title": "Tam giác cân ABC",
      "description": "Đáy BC = 6 cm, cạnh bên = 5 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Vẽ tam giác cân ABC: đáy BC = 6 cm, AB = AC = 5 cm.",
      "params": {
        "a": 6,
        "b": 5,
        "h": 4
      },
      "givenParams": [
        "a",
        "b"
      ]
    },
    {
      "id": "right-triangle-basic",
      "shapeKey": "right_triangle",
      "title": "Tam giác vuông tại A",
      "description": "AB = 3 cm, AC = 4 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Vẽ tam giác vuông tại A: AB = 3 cm, AC = 4 cm.",
      "params": {
        "a": 3,
        "b": 4
      },
      "givenParams": [
        "a",
        "b"
      ]
    },
    {
      "id": "right-isosceles-triangle",
      "shapeKey": "right_isosceles_triangle",
      "title": "Tam giác vuông cân",
      "description": "Góc vuông tại A, cạnh = 4 cm",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Vẽ tam giác vuông cân tại A, cạnh góc vuông = 4 cm.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "parallel-lines-basic",
      "shapeKey": "parallel_lines",
      "title": "Hai đường thẳng song song",
      "description": "AB // CD",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Vẽ hai đường thẳng song song AB và CD.",
      "params": {
        "a": 5,
        "h": 2
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "perpendicular-lines-basic",
      "shapeKey": "perpendicular_lines",
      "title": "Hai đường thẳng vuông góc",
      "description": "AB ⊥ CD",
      "level": "basic",
      "grade": "lop7",
      "prompt": "Vẽ hai đường thẳng AB và CD vuông góc nhau.",
      "params": {
        "a": 4
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "perpendicular-bisector-lop7",
      "shapeKey": "perpendicular_bisector",
      "title": "Đường trung trực của AB",
      "description": "Đoạn AB = 6 cm và đường trung trực",
      "level": "intermediate",
      "grade": "lop7",
      "prompt": "Vẽ đoạn AB = 6 cm và đường trung trực.",
      "params": {
        "a": 6
      },
      "givenParams": [
        "a"
      ]
    },
    {
      "id": "angle-bisector-lop7",
      "shapeKey": "angle_bisector",
      "title": "Phân giác góc 60°",
      "description": "Góc 60° và tia phân giác",
      "level": "intermediate",
      "grade": "lop7",
      "prompt": "Vẽ góc BAC = 60° và tia phân giác AD.",
      "params": {
        "a2": 60,
        "a": 3
      },
      "givenParams": [
        "a2"
      ]
    },
    {
      "id": "parallelogram-basic",
      "shapeKey": "parallelogram",
      "title": "Hình bình hành ABCD",
      "description": "Đáy 6, cạnh bên 4, cao 3",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Vẽ hình bình hành ABCD: đáy 6 cm, cạnh bên 4 cm, chiều cao 3 cm.",
      "params": {
        "a": 6,
        "b": 4,
        "h": 3
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "parallelogram-area",
      "shapeKey": "parallelogram",
      "title": "Hình bình hành — tính S",
      "description": "Đáy 10, cao 5 cm",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Hình bình hành đáy 10 cm, cao 5 cm. Tính diện tích.",
      "params": {
        "a": 10,
        "b": 6,
        "h": 5
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "rhombus-basic",
      "shapeKey": "rhombus",
      "title": "Hình thoi ABCD",
      "description": "Cạnh 5 cm, cao 4 cm",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Vẽ hình thoi ABCD cạnh 5 cm, chiều cao 4 cm.",
      "params": {
        "a": 5,
        "h": 4
      },
      "givenParams": [
        "a",
        "h"
      ]
    },
    {
      "id": "rhombus-diagonal",
      "shapeKey": "rhombus",
      "title": "Hình thoi — đường chéo 6 và 8 cm",
      "description": "Đường chéo d₁=6, d₂=8",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Hình thoi đường chéo AC = 6 cm, BD = 8 cm. Tính diện tích và chu vi."
    },
    {
      "id": "trapezoid-basic",
      "shapeKey": "trapezoid",
      "title": "Hình thang ABCD",
      "description": "Đáy lớn 8, đáy nhỏ 5, cao 4",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Vẽ hình thang ABCD: đáy lớn 8 cm, đáy nhỏ 5 cm, cao 4 cm.",
      "params": {
        "a": 8,
        "b": 5,
        "h": 4
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "isosceles-trapezoid-basic",
      "shapeKey": "isosceles_trapezoid",
      "title": "Hình thang cân ABCD",
      "description": "Đáy 8, đáy nhỏ 4, cao 3",
      "level": "basic",
      "grade": "lop8",
      "prompt": "Vẽ hình thang cân ABCD: đáy lớn 8, đáy nhỏ 4, cao 3 cm.",
      "params": {
        "a": 8,
        "b": 4,
        "h": 3
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "isosceles-trapezoid-problem",
      "shapeKey": "isosceles_trapezoid",
      "title": "Hình thang cân — tính S và chu vi",
      "description": "Đáy 10, đáy nhỏ 6, cao 4",
      "level": "intermediate",
      "grade": "lop8",
      "prompt": "Hình thang cân: đáy lớn 10 cm, đáy nhỏ 6 cm, cao 4 cm. Tính S và chu vi.",
      "params": {
        "a": 10,
        "b": 6,
        "h": 4
      },
      "givenParams": [
        "a",
        "b",
        "h"
      ]
    },
    {
      "id": "circle-basic",
      "shapeKey": "circle",
      "title": "Đường tròn R = 5 cm",
      "description": "Đường tròn (O;5) — tính C và S",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Vẽ đường tròn tâm O bán kính R = 5 cm. Tính chu vi và diện tích.",
      "params": {
        "r": 5
      },
      "givenParams": [
        "r"
      ]
    },
    {
      "id": "circle-radius",
      "shapeKey": "circle",
      "title": "Bán kính và đường kính",
      "description": "R = 4 cm — phân biệt OA và AB",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Đường tròn (O;4): vẽ bán kính OA và đường kính AB.",
      "params": {
        "r": 4
      },
      "givenParams": [
        "r"
      ]
    },
    {
      "id": "circle-chord",
      "shapeKey": "circle",
      "title": "Dây cung CD",
      "description": "Đường tròn R = 6, dây cung CD = 8",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Đường tròn (O;6). Vẽ dây cung CD = 8 cm. Tính khoảng cách từ O đến CD."
    },
    {
      "id": "circle-tangent",
      "shapeKey": "circle",
      "title": "Tiếp tuyến tại điểm A",
      "description": "Tiếp tuyến vuông góc với bán kính OA",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Đường tròn (O;5). Vẽ tiếp tuyến tại A trên đường tròn."
    },
    {
      "id": "circle-secant",
      "shapeKey": "circle",
      "title": "Cát tuyến từ điểm ngoài",
      "description": "Cát tuyến từ M ngoài đường tròn",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Đường tròn (O;4). Điểm M ngoài đường tròn. Vẽ cát tuyến từ M cắt tại A và B."
    },
    {
      "id": "sector-90",
      "shapeKey": "sector",
      "title": "Hình quạt 90°, R = 4 cm",
      "description": "Hình quạt góc 90°",
      "level": "basic",
      "grade": "lop9",
      "prompt": "Hình quạt tròn (O;4), góc ở tâm 90°. Tính S và độ dài cung.",
      "params": {
        "r": 4,
        "a2": 90
      },
      "givenParams": [
        "r",
        "a2"
      ]
    },
    {
      "id": "sector-120",
      "shapeKey": "sector",
      "title": "Hình quạt 120°, R = 6 cm",
      "description": "Hình quạt góc 120°",
      "level": "intermediate",
      "grade": "lop9",
      "prompt": "Hình quạt tròn (O;6), góc ở tâm 120°. Tính S và cung.",
      "params": {
        "r": 6,
        "a2": 120
      },
      "givenParams": [
        "r",
        "a2"
      ]
    }
  ]
}

export default shapesDatabase
