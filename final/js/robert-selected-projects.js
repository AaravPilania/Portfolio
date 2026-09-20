/**
 * Robert Borghesi - Selected Works 1:1 Pixel-Perfect Engine
 * Complete authentic replica from robertborghesi.is production source
 */

(function () {
    'use strict';

    const PROJECTS = [
    {
        "label": "//25",
        "client": "LAB",
        "title": "ASTRODITHER",
        "key": "astrodither",
        "images": [
            {
                "key": "astrodither-1",
                "type": "video",
                "path": "/images/gl/astrodither/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/astrodither/1.mp4"
            },
            {
                "key": "astrodither-2",
                "type": "texture",
                "path": "/images/gl/astrodither/2.jpg",
                "width": 0.38,
                "position": {
                    "desktop": [
                        -0.95,
                        -0.55
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/astrodither/2.jpg"
            },
            {
                "key": "astrodither-3",
                "type": "texture",
                "path": "/images/gl/astrodither/3.jpg",
                "width": 0.37,
                "position": {
                    "desktop": [
                        0.9,
                        0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/astrodither/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/astrodither"
            }
        ],
        "link": "https://astrodither.robertborghesi.is/"
    },
    {
        "label": "//24",
        "client": "LAB",
        "title": "Dracarys",
        "key": "dracarys",
        "images": [
            {
                "key": "dracarys-1",
                "type": "video",
                "path": "/images/gl/dracarys/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/dracarys/1.mp4"
            },
            {
                "key": "dracarys-2",
                "type": "video",
                "path": "/images/gl/dracarys/2.mp4",
                "width": 0.38,
                "position": {
                    "desktop": [
                        -1.08,
                        0.65
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/dracarys/2.mp4"
            },
            {
                "key": "dracarys-3",
                "type": "video",
                "path": "/images/gl/dracarys/3.mp4",
                "width": 0.42,
                "position": {
                    "desktop": [
                        0.9,
                        -0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/dracarys/3.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/dracarys"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/dracarys"
            }
        ],
        "link": "https://dracarys.robertborghesi.is/"
    },
    {
        "label": "//24",
        "client": "OddCommon",
        "title": "OC#2",
        "key": "oc2",
        "images": [
            {
                "key": "oc2-1",
                "type": "video",
                "path": "/images/gl/oc2/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/oc2/1.mp4"
            },
            {
                "key": "oc2-2",
                "type": "video",
                "path": "/images/gl/oc2/2.mp4",
                "width": 0.32,
                "position": {
                    "desktop": [
                        1.05,
                        -0.65
                    ],
                    "mobile": [
                        -0.43,
                        1.4
                    ]
                },
                "url": "/images/gl/oc2/2.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/oddcommon-website"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/oddcommon-website"
            }
        ],
        "link": "https://www.oddcommon.com/"
    },
    {
        "label": "//22",
        "client": "Longines",
        "title": "Zulu",
        "key": "longines",
        "images": [
            {
                "key": "longines-1",
                "type": "video",
                "path": "/images/gl/longines/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/longines/1.mp4"
            },
            {
                "key": "longines-2",
                "type": "texture",
                "path": "/images/gl/longines/2.jpg",
                "width": 0.3,
                "position": {
                    "desktop": [
                        0.8,
                        1.05
                    ],
                    "mobile": [
                        0.55,
                        1.15
                    ]
                },
                "url": "/images/gl/longines/2.jpg"
            },
            {
                "key": "longines-3",
                "type": "texture",
                "path": "/images/gl/longines/3.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -1.05,
                        -0.38
                    ],
                    "mobile": [
                        -0.65,
                        -0.95
                    ]
                },
                "url": "/images/gl/longines/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/zulu-longines"
            },
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/zulu-longines-p2"
            }
        ],
        "link": "https://www.longines.com/zulu/"
    },
    {
        "label": "//21",
        "client": "Google",
        "title": "Medusae Art Project",
        "key": "medusae",
        "images": [
            {
                "key": "medusae-1",
                "type": "video",
                "path": "/images/gl/medusae/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/medusae/1.mp4"
            },
            {
                "key": "medusae-2",
                "type": "texture",
                "path": "/images/gl/medusae/2.jpg",
                "width": 0.43,
                "position": {
                    "desktop": [
                        -1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.25,
                        1.13
                    ]
                },
                "url": "/images/gl/medusae/2.jpg"
            },
            {
                "key": "medusae-3",
                "type": "video",
                "path": "/images/gl/medusae/3.mp4",
                "width": 0.38,
                "position": {
                    "desktop": [
                        0.85,
                        -0.95
                    ],
                    "mobile": [
                        0.45,
                        -1.2
                    ]
                },
                "url": "/images/gl/medusae/3.mp4"
            }
        ],
        "link": "https://experiments.withgoogle.com/medusae-climate-change"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "Horsebit",
        "key": "horsebit",
        "images": [
            {
                "key": "horsebit-1",
                "type": "texture",
                "path": "/images/gl/horsebit/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/horsebit/1.jpg"
            },
            {
                "key": "horsebit-2",
                "type": "texture",
                "path": "/images/gl/horsebit/2.jpg",
                "width": 0.3,
                "position": {
                    "desktop": [
                        -1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.2,
                        1.1
                    ]
                },
                "url": "/images/gl/horsebit/2.jpg"
            },
            {
                "key": "horsebit-3",
                "type": "video",
                "path": "/images/gl/horsebit/3.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        0.9,
                        -0.7
                    ],
                    "mobile": [
                        0.4,
                        -1.3
                    ]
                },
                "url": "/images/gl/horsebit/3.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/gucci-1955-horsebit-bag"
            }
        ],
        "link": "https://1955horsebit.gucci.com/"
    },
    {
        "label": "//22",
        "client": "Maya Lin",
        "title": "What is missing",
        "key": "wim",
        "images": [
            {
                "key": "wim-1",
                "type": "video",
                "path": "/images/gl/wim/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/wim/1.mp4"
            },
            {
                "key": "wim-2",
                "type": "video",
                "path": "/images/gl/wim/2.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        -0.8,
                        0.96
                    ],
                    "mobile": [
                        -0.2,
                        1.16
                    ]
                },
                "url": "/images/gl/wim/2.mp4"
            },
            {
                "key": "wim-3",
                "type": "texture",
                "path": "/images/gl/wim/3.jpg",
                "width": 0.45,
                "position": {
                    "desktop": [
                        1.05,
                        -0.85
                    ],
                    "mobile": [
                        0.36,
                        -1.25
                    ]
                },
                "url": "/images/gl/wim/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "WEBBY//x3",
                "link": "https://winners.webbyawards.com/2023/websites-and-mobile-sites/features-design/best-navigationstructure/246279/what-is-missing"
            },
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/what-is-missing"
            }
        ],
        "link": "https://whatismissing.org/"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "Let Girls Dream",
        "key": "sitara",
        "images": [
            {
                "key": "sitara-1",
                "type": "video",
                "path": "/images/gl/sitara/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/sitara/1.mp4"
            },
            {
                "key": "sitara-2",
                "type": "video",
                "path": "/images/gl/sitara/3.mp4",
                "width": 0.45,
                "position": {
                    "desktop": [
                        0.9,
                        -0.65
                    ],
                    "mobile": [
                        -0.3,
                        -1.15
                    ]
                },
                "url": "/images/gl/sitara/3.mp4"
            },
            {
                "key": "sitara-3",
                "type": "texture",
                "path": "/images/gl/sitara/2.jpg",
                "width": 0.32,
                "position": {
                    "desktop": [
                        -0.95,
                        0.8
                    ],
                    "mobile": [
                        0.4,
                        1.26
                    ]
                },
                "url": "/images/gl/sitara/2.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/let-girls-dream"
            },
            {
                "label": "SOTD",
                "link": "https://www.awwwards.com/sites/let-girls-dream"
            }
        ],
        "link": "https://www.letgirlsdream.org/"
    },
    {
        "label": "//21",
        "client": "Adidas",
        "title": "Secret Page",
        "key": "adidas",
        "images": [
            {
                "key": "adidas-1",
                "type": "video",
                "path": "/images/gl/adidas/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/adidas/1.mp4"
            },
            {
                "key": "adidas-2",
                "type": "video",
                "path": "/images/gl/adidas/3.mp4",
                "width": 0.5,
                "position": {
                    "desktop": [
                        1.05,
                        0.3
                    ],
                    "mobile": [
                        -0.43,
                        1.4
                    ]
                },
                "url": "/images/gl/adidas/3.mp4"
            },
            {
                "key": "adidas-3",
                "type": "texture",
                "path": "/images/gl/adidas/2.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -0.85,
                        -0.8
                    ],
                    "mobile": [
                        0.23,
                        -1.26
                    ]
                },
                "url": "/images/gl/adidas/2.jpg"
            }
        ]
    },
    {
        "label": "//19",
        "client": "ONEOFF",
        "title": "ONE-OFF",
        "key": "oneoff",
        "images": [
            {
                "key": "oneoff-1",
                "type": "texture",
                "path": "/images/gl/oneoff/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/oneoff/1.jpg"
            },
            {
                "key": "oneoff-2",
                "type": "video",
                "path": "/images/gl/oneoff/2.mp4",
                "width": 0.4,
                "position": {
                    "desktop": [
                        -0.7,
                        0.9
                    ],
                    "mobile": [
                        -0.17,
                        1.3
                    ]
                },
                "url": "/images/gl/oneoff/2.mp4"
            },
            {
                "key": "oneoff-3",
                "type": "video",
                "path": "/images/gl/oneoff/3.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        0.6,
                        -0.9
                    ],
                    "mobile": [
                        0.2,
                        -1.14
                    ]
                },
                "url": "/images/gl/oneoff/3.mp4"
            }
        ],
        "link": "https://www.one-off.it/"
    },
    {
        "label": "//19",
        "client": "Gucci",
        "title": "24 Hour Ace",
        "key": "ace",
        "images": [
            {
                "key": "ace-1",
                "type": "video",
                "path": "/images/gl/ace/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/ace/1.mp4"
            },
            {
                "key": "ace-2",
                "type": "video",
                "path": "/images/gl/ace/2.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -0.98,
                        0.5
                    ],
                    "mobile": [
                        0.14,
                        1.15
                    ]
                },
                "url": "/images/gl/ace/2.mp4"
            },
            {
                "key": "ace-3",
                "type": "texture",
                "path": "/images/gl/ace/3.jpg",
                "width": 0.25,
                "position": {
                    "desktop": [
                        -1.1,
                        -0.35
                    ],
                    "mobile": [
                        0.34,
                        -1.35
                    ]
                },
                "url": "/images/gl/ace/3.jpg"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/24hourace"
            }
        ]
    },
    {
        "label": "//20",
        "client": "SAP",
        "title": "Power of Procurement",
        "key": "sap",
        "images": [
            {
                "key": "sap-1",
                "type": "video",
                "path": "/images/gl/sap/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/sap/1.mp4"
            },
            {
                "key": "sap-2",
                "type": "video",
                "path": "/images/gl/sap/2.mp4",
                "width": 0.35,
                "position": {
                    "desktop": [
                        1.1,
                        -0.45
                    ],
                    "mobile": [
                        0,
                        -1.15
                    ]
                },
                "url": "/images/gl/sap/2.mp4"
            }
        ],
        "awards": [
            {
                "label": "FWA",
                "link": "https://thefwa.com/cases/power-of-procurement-interactive-3d-tour"
            }
        ],
        "link": "https://demodern.com/projects/sap-virtual-3d-product-tour"
    },
    {
        "label": "//23",
        "client": "Metamask",
        "title": "Learn Metamask",
        "key": "metamask",
        "images": [
            {
                "key": "metamask-1",
                "type": "video",
                "path": "/images/gl/metamask/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/metamask/1.mp4"
            }
        ],
        "awards": [
            {
                "label": "WEBBY",
                "link": "https://winners.webbyawards.com/2024/websites-and-mobile-sites/features-design/best-practices/274522/metamask-learn"
            }
        ],
        "link": "https://learn.metamask.io/"
    },
    {
        "label": "//23",
        "client": "Web3://",
        "title": "AV0LVE",
        "key": "avolve",
        "images": [
            {
                "key": "avolve-1",
                "type": "video",
                "path": "/images/gl/avolve/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/avolve/1.mp4"
            },
            {
                "key": "avolve-2",
                "type": "texture",
                "path": "/images/gl/avolve/2.jpg",
                "width": 0.4,
                "position": {
                    "desktop": [
                        -1.05,
                        0.75
                    ],
                    "mobile": [
                        0.1,
                        1.25
                    ]
                },
                "url": "/images/gl/avolve/2.jpg"
            }
        ],
        "link": "https://www.av0lve.xyz/"
    },
    {
        "label": "//23",
        "client": "Web3://",
        "title": "FAIR",
        "key": "fair",
        "images": [
            {
                "key": "fair-1",
                "type": "texture",
                "path": "/images/gl/fair/1.jpg",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/fair/1.jpg"
            },
            {
                "key": "fair-2",
                "type": "video",
                "path": "/images/gl/fair/2.mp4",
                "width": 0.7,
                "position": {
                    "desktop": [
                        0.8,
                        0.3
                    ],
                    "mobile": [
                        0.1,
                        0.6
                    ]
                },
                "url": "/images/gl/fair/2.mp4"
            },
            {
                "key": "fair-3",
                "type": "video",
                "path": "/images/gl/fair/3.mp4",
                "width": 0.3,
                "position": {
                    "desktop": [
                        -0.75,
                        -0.5
                    ],
                    "mobile": [
                        -0.15,
                        -1.15
                    ]
                },
                "url": "/images/gl/fair/3.mp4"
            }
        ],
        "link": "https://fair.xyz/"
    },
    {
        "label": "//22",
        "client": "Web3://",
        "title": "Hypnotica",
        "key": "hypnotica",
        "images": [
            {
                "key": "hypnotica-1",
                "type": "video",
                "path": "/images/gl/hypnotica/1.mp4",
                "width": 1,
                "position": {
                    "desktop": [
                        0,
                        0
                    ],
                    "mobile": [
                        0,
                        0
                    ]
                },
                "url": "/images/gl/hypnotica/1.mp4"
            },
            {
                "key": "hypnotica-2",
                "type": "texture",
                "path": "/images/gl/hypnotica/2.jpg",
                "width": 0.35,
                "position": {
                    "desktop": [
                        -1.05,
                        0.45
                    ],
                    "mobile": [
                        0.2,
                        1.25
                    ]
                },
                "url": "/images/gl/hypnotica/2.jpg"
            },
            {
                "key": "hypnotica-3",
                "type": "texture",
                "path": "/images/gl/hypnotica/3.jpg",
                "width": 0.28,
                "position": {
                    "desktop": [
                        0.63,
                        -0.92
                    ],
                    "mobile": [
                        -0.03,
                        -1.12
                    ]
                },
                "url": "/images/gl/hypnotica/3.jpg"
            }
        ],
        "link": "https://www.hypnotica.xyz/"
    }
];

    // Simplex Noise Shaders (A3 vertex, R3 fragment)
    const NOISE_VS = `varying vec2 vUv;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}`;

    const NOISE_FS = `precision highp float;
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

uniform float uRatio;
uniform float uColsFactorBig;
uniform float uColsFactorSmall;
uniform float uNoiseFactor;
varying vec2 vUv;

float calcNoise(float _ratio, float _colsFactor, float _noiseFactor) {
    float cols = 8.0 * _colsFactor;
    float rows = cols / _ratio;
    float x = ceil(vUv.x * cols);
    float y = floor((1.0 - vUv.y) * rows);
    return (snoise(vec2(x, y) * _noiseFactor) + 1.0) * 0.5;
}

void main() {
    float r = calcNoise(uRatio, uColsFactorBig, uNoiseFactor);
    float g = calcNoise(uRatio, uColsFactorSmall, uNoiseFactor);
    gl_FragColor = vec4(r, g, 0.0, 1.0);
}`;

    // Exact Mesh Shaders (x3 vertex, S3 fragment)
    const MESH_VS = `varying vec2 vUv;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}`;

    const MESH_FS = `precision highp float;
uniform float uProgressEnter;
uniform float uProgressEnterPixel;
uniform float uColsFactor;
uniform float uRatio;
uniform sampler2D uTxt;
uniform sampler2D uNoiseTxt;
varying vec2 vUv;

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

void main() {
    #ifdef IS_BIG
        float noise = texture2D(uNoiseTxt, vUv).r;
    #else
        float noise = texture2D(uNoiseTxt, vUv).g;
    #endif

    float cols = 8.0 * uColsFactor;
    float rows = cols / uRatio;

    float alphaProg = uProgressEnter;
    float alpha = alphaProg <= 0.002 ? 0.0 : (1.0 - step(alphaProg, noise));
    float cut = 0.001;
    alpha *= aastep(cut, vUv.x);
    alpha *= 1.0 - aastep(1.0 - cut, vUv.x);
    alpha *= aastep(cut, vUv.y);
    alpha *= 1.0 - aastep(1.0 - cut, vUv.y);

    float np = floor(uProgressEnterPixel * 20.0) / 20.0;
    float pf = 20.0;
    float nc = mix(cols * 0.3, cols * pf, np);
    float nr = mix(rows * 0.3, rows * pf, np);

    vec2 puv = vec2(
        floor(vUv.x * nc + 0.5) / nc,
        floor(vUv.y * nr + 0.5) / nr
    );
    puv = mix(puv, vUv, smoothstep(0.9, 1.0, np));

    vec4 txt = texture2D(uTxt, puv);

    gl_FragColor = vec4(txt.rgb, alpha);
}`;

    // Presets from Robert Borghesi's source
    const PRESETS = [
        { colsFactor: 8, smallColsFactor: 4, noiseFactor: 0.071 },
        { colsFactor: 3, smallColsFactor: 3, noiseFactor: 0.071 },
        { colsFactor: 7, smallColsFactor: 3, noiseFactor: 0.055 },
        { colsFactor: 4, smallColsFactor: 3, noiseFactor: 0.045 }
    ];

    const Z_OFFSETS = [{ z: 0 }, { z: 120 }, { z: 200 }, { z: 40 }];
    const P3 = n => Math.sin(0.3 * n - Math.cos(1 * n)) + Math.sin(0.4 * n + Math.cos(2 * n));

    // Global Preloaded Resource Store
    const RESOURCES = new Map();

    function preloadAllProjectAssets() {
        PROJECTS.forEach(project => {
            project.images.forEach(img => {
                if (RESOURCES.has(img.key)) return;

                if (img.type === 'video') {
                    const video = document.createElement('video');
                    video.width = 640;
                    video.height = 360;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.preload = "auto";
                    video.crossOrigin = "anonymous";
                    video.style.display = "none";
                    video.src = img.url;
                    document.body.appendChild(video);

                    const tex = new THREE.VideoTexture(video);
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.isVideoTexture = true;
                    tex.userData = { video };

                    video.addEventListener('canplay', () => {
                        tex.needsUpdate = true;
                    });
                    video.load();

                    RESOURCES.set(img.key, tex);
                } else {
                    const tex = new THREE.TextureLoader().load(img.url, (loaded) => {
                        loaded.needsUpdate = true;
                    });
                    tex.minFilter = THREE.LinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.isVideoTexture = false;
                    RESOURCES.set(img.key, tex);
                }
            });
        });
    }

    class NoiseRTTGenerator {
        constructor(renderer, preset) {
            this.renderer = renderer;
            this.preset = preset;
            this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 1000);
            this.camera.position.z = 10;
            this.rtt = new THREE.WebGLRenderTarget(1024, 1024, { depthBuffer: false, stencilBuffer: false });
            
            const mat = new THREE.ShaderMaterial({
                vertexShader: NOISE_VS,
                fragmentShader: NOISE_FS,
                uniforms: {
                    uRatio: { value: 1.6 },
                    uColsFactorBig: { value: preset.colsFactor },
                    uColsFactorSmall: { value: preset.smallColsFactor },
                    uNoiseFactor: { value: preset.noiseFactor }
                }
            });
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
            this.renderer.setRenderTarget(this.rtt);
            this.renderer.render(mesh, this.camera);
            this.renderer.setRenderTarget(null);
            mat.dispose();
            mesh.geometry.dispose();
        }
        get texture() {
            return this.rtt.texture;
        }
    }

    class ProjectGroup extends THREE.Group {
        constructor(data, presetRtt, onRemoveCallback, type = "desktop") {
            super();
            this.data = data;
            this.presetRtt = presetRtt;
            this.onRemoveCallback = onRemoveCallback;
            this.type = type;
            this.meshes = [];
            this.videos = [];
            this.tl1 = gsap.timeline();
            this.tl2 = gsap.timeline();
            this.tweens = [];
            this.isLeaving = false;
            this.isLeavingFinal = false;
            this.visible = false;
            this.uuid = THREE.MathUtils.generateUUID();

            this.init();
        }

        init() {
            const { colsFactor, smallColsFactor } = this.presetRtt.preset;
            const noiseTex = this.presetRtt.texture;

            this.data.images.forEach((imgData, idx) => {
                const isBig = idx === 0;
                const cols = isBig ? colsFactor : smallColsFactor;
                
                let texture = RESOURCES.get(imgData.key);
                let isVideo = imgData.type === 'video';

                if (!texture) {
                    if (isVideo) {
                        const video = document.createElement('video');
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.crossOrigin = 'anonymous';
                        video.src = imgData.url;
                        video.load();
                        texture = new THREE.VideoTexture(video);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.isVideoTexture = true;
                        texture.userData = { video };
                    } else {
                        texture = new THREE.TextureLoader().load(imgData.url);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                    }
                }

                if (isVideo && texture.userData && texture.userData.video) {
                    this.videos.push(texture.userData.video);
                }

                const d = 16 / 9;
                const f = 1;
                const m = f / d;
                const g = f * imgData.width;
                const pos = imgData.position[this.type] || imgData.position.desktop || [0, 0];
                const y = g / d;

                const mat = new THREE.ShaderMaterial({
                    vertexShader: MESH_VS,
                    fragmentShader: MESH_FS,
                    uniforms: {
                        uProgressEnter: { value: 0 },
                        uProgressEnterPixel: { value: 0 },
                        uTxt: { value: texture },
                        uColsFactor: { value: cols },
                        uRatio: { value: d },
                        uNoiseTxt: { value: noiseTex }
                    },
                    defines: {
                        DECODE_VIDEO_TEXTURE: isVideo,
                        IS_BIG: isBig
                    },
                    transparent: true,
                    depthTest: false,
                    depthWrite: false
                });

                const geom = new THREE.PlaneGeometry(1, 1);
                const mesh = new THREE.Mesh(geom, mat);
                mesh.scale.x = g;
                mesh.scale.y = y;
                mesh.position.x = pos[0] * 0.5 * f;
                mesh.position.y = pos[1] * 0.5 * m;
                mesh.position.z = (Z_OFFSETS[idx] || { z: 0 }).z;
                mesh.userData.initialPosition = mesh.position.clone();

                this.meshes.push(mesh);
                this.add(mesh);
            });

            this.enter();
        }

        enter() {
            this.visible = true;
            this.tl1.clear();
            this.tl2.clear();

            this.videos.forEach(v => {
                v.currentTime = 0;
                const p = v.play();
                if (p !== undefined) p.catch(() => {});
            });

            const dur = 1.0;
            this.meshes.forEach((mesh, idx) => {
                const mat = mesh.material;
                if (idx === 0) {
                    this.tl1.to(mat.uniforms.uProgressEnter, { value: 1, duration: dur, ease: "power2.out" }, 0);
                    this.tl2.to(mat.uniforms.uProgressEnterPixel, { value: 1, duration: dur * 1.35, ease: "power1.in" }, 0);
                } else {
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnter, { value: 1, duration: dur, ease: "power2.out" }));
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnterPixel, { value: 1, duration: dur * 1.35, ease: "power1.in" }));
                }
            });

            if (this.onRemoveCallback) {
                this.tl1.call(this.onRemoveCallback, null, dur * 0.5);
            }
            this.tl1.restart();
            this.tl2.restart();
        }

        leaveSecondary() {
            if (this.isLeaving) return;
            this.isLeaving = true;
            this.tweens.forEach(t => t && t.kill());
            this.meshes.forEach((mesh, idx) => {
                if (idx > 0) {
                    const mat = mesh.material;
                    const cur = mat.uniforms.uProgressEnter.value;
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnter, { value: 0, duration: Math.max(0.12, cur * 0.4), ease: "power2.in" }));
                    this.tweens.push(gsap.to(mat.uniforms.uProgressEnterPixel, { value: 0, duration: Math.max(0.12, cur * 0.6), ease: "power1.out" }));
                }
            });
        }

        leaveAll(callback) {
            if (this.isLeavingFinal) return;
            this.isLeavingFinal = true;
            this.leaveSecondary();
            this.tl1.clear();
            this.tl2.clear();

            if (this.meshes.length > 0) {
                const mat = this.meshes[0].material;
                const cur = mat.uniforms.uProgressEnter.value;
                const dur = Math.max(0.15, cur * 0.45);
                this.tl1.to(mat.uniforms.uProgressEnter, { value: 0, duration: dur, ease: "power2.in" }, 0);
                this.tl2.to(mat.uniforms.uProgressEnterPixel, { value: 0, duration: dur * 1.2, ease: "power1.out" }, 0);
                gsap.delayedCall(dur + 0.02, () => {
                    this.videos.forEach(v => {
                        try { v.pause(); } catch(e) {}
                    });
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        }

        leave(type, callback) {
            if (type === "last") {
                this.leaveSecondary();
            } else if (type === "all") {
                this.leaveAll(callback);
            }
        }

        animate(floatYArr, mouseSmooth) {
            this.meshes.forEach((mesh, i) => {
                const r = i;
                const s = (i + 1) % floatYArr.length;
                mesh.position.x = mesh.userData.initialPosition.x + floatYArr[r] * 0.01 + mouseSmooth.x * 0.02 * r;
                mesh.position.y = mesh.userData.initialPosition.y + floatYArr[s] * 0.01 + mouseSmooth.y * 0.02 * r;
            });
        }

        destroy() {
            this.tweens.forEach(t => t && t.kill());
            this.meshes.forEach(m => {
                if (m.material) m.material.dispose();
                if (m.geometry) m.geometry.dispose();
            });
            this.videos.forEach(v => {
                try { v.pause(); } catch(e) {}
            });
            this.tl1.kill();
            this.tl2.kill();
        }
    }

    class RobertSelectedProjectsGL {
        constructor() {
            this.canvas = document.querySelector('#canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'canvas';
                document.body.prepend(this.canvas);
            }

            preloadAllProjectAssets();

            this.tracker = document.querySelector('.projects__gl');
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: false,
                stencil: false,
                powerPreference: "high-performance"
            });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(15, window.innerWidth / window.innerHeight, 1, 10000);
            this.camera.position.z = 10;

            this.contentGroup = new THREE.Group();
            this.contentGroup.rotation.order = "YXZ";
            this.scene.add(this.contentGroup);

            this.queueMap = new Map();
            this.lastEnterKey = null;
            this.presetProgress = 0;
            this.floatYArr = [0, 0, 0, 0];
            this.speed = 0;
            this.mouse = {
                target: { x: 0, y: 0 },
                smooth: { x: 0, y: 0 },
                prev: 0
            };
            this.clock = new THREE.Clock();
            this.timeElapsed = 0;
            this.size = { w: 600, h: 600 };

            this.initNoiseMaps();
            this.initAudio();
            this.initEvents();
            this.resize();

            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        initNoiseMaps() {
            this.noisePresets = PRESETS.map(p => {
                return new NoiseRTTGenerator(this.renderer, p);
            });
        }

        initAudio() {
            this.tickAudio = new Audio('./audio/tick.mp3');
            this.tickAudio.volume = 0.45;
            let lastTickTime = 0;
            this.playTick = () => {
                const now = performance.now();
                if (now - lastTickTime < 75) return;
                lastTickTime = now;
                try {
                    this.tickAudio.currentTime = 0;
                    this.tickAudio.play().catch(() => {});
                } catch(e) {}
            };
        }

        initEvents() {
            window.addEventListener('resize', () => this.resize(), { passive: true });

            this.lastMouseX = null;
            this.lastMouseY = null;
            this.isMouseInViewport = false;

            const section = document.getElementById('section-projects');
            const entries = Array.from(document.querySelectorAll('.projects__entry'));
            let activeHoverRow = null;

            const updateMousePosition = (cx, cy) => {
                this.lastMouseX = cx;
                this.lastMouseY = cy;
                this.isMouseInViewport = true;
                this.mouse.target.x = (cx / window.innerWidth) * 2 - 1;
                this.mouse.target.y = -(cy / window.innerHeight) * 2 + 1;
            };

            this.checkHoverBounds = (clientX, clientY) => {
                if (clientX === null || clientY === null || !this.isMouseInViewport) return;

                // Quick section visibility check: if section is completely off-screen, clear hover
                if (section) {
                    const secRect = section.getBoundingClientRect();
                    if (secRect.bottom < 0 || secRect.top > window.innerHeight) {
                        if (activeHoverRow) {
                            activeHoverRow = null;
                            entries.forEach(e => {
                                e.classList.remove('h-mainOpacity--full');
                                e.classList.remove('is-hovered');
                            });
                            gsap.set('html', { '--mainOpacity': 1 });
                            this.leaveProject("all");
                        }
                        return;
                    }
                }

                let foundRow = null;

                for (let i = 0; i < entries.length; i++) {
                    const row = entries[i];
                    const rect = row.getBoundingClientRect();

                    // Vertical check: within row height (with 1px overlap tolerance)
                    if (clientY >= rect.top - 1 && clientY <= rect.bottom + 1) {
                        // Horizontal check: row container bounds with margin tolerance (up to 48px into container padding)
                        // so cursor touching the list in the margin or on the elements activates reliably,
                        // while cursors far off the table (outside the table container) do not trigger.
                        const leftLimit = rect.left - 48;
                        const rightLimit = rect.right + 48;

                        if (clientX >= leftLimit && clientX <= rightLimit) {
                            foundRow = row;
                            break;
                        }
                    }
                }

                if (foundRow) {
                    if (activeHoverRow !== foundRow) {
                        activeHoverRow = foundRow;
                        entries.forEach(e => {
                            e.classList.remove('h-mainOpacity--full');
                            e.classList.remove('is-hovered');
                        });
                        foundRow.classList.add('h-mainOpacity--full');
                        foundRow.classList.add('is-hovered');
                        gsap.set('html', { '--mainOpacity': 0.03 });
                        this.playTick();
                        const key = foundRow.getAttribute('data-project-key');
                        if (key) this.enterProject(key);
                    }
                } else {
                    if (activeHoverRow) {
                        activeHoverRow = null;
                        entries.forEach(e => {
                            e.classList.remove('h-mainOpacity--full');
                            e.classList.remove('is-hovered');
                        });
                        gsap.set('html', { '--mainOpacity': 1 });
                        this.leaveProject("all");
                    }
                }
            };

            const onMouseMove = (e) => {
                updateMousePosition(e.clientX, e.clientY);
                this.checkHoverBounds(e.clientX, e.clientY);
            };

            const onWheel = (e) => {
                updateMousePosition(e.clientX, e.clientY);
                this.checkHoverBounds(e.clientX, e.clientY);
            };

            const onScroll = () => {
                if (this.lastMouseX !== null && this.lastMouseY !== null) {
                    this.checkHoverBounds(this.lastMouseX, this.lastMouseY);
                }
            };

            window.addEventListener('mousemove', onMouseMove, { passive: true });
            window.addEventListener('pointermove', onMouseMove, { passive: true });
            window.addEventListener('wheel', onWheel, { capture: true, passive: true });
            window.addEventListener('scroll', onScroll, { capture: true, passive: true });
            document.addEventListener('scroll', onScroll, { capture: true, passive: true });

            const scroller = document.querySelector('.js-scroller');
            if (scroller) {
                scroller.addEventListener('scroll', onScroll, { passive: true });
            }

            window.addEventListener('mouseleave', () => {
                this.isMouseInViewport = false;
                if (activeHoverRow) {
                    activeHoverRow = null;
                    entries.forEach(e => {
                        e.classList.remove('h-mainOpacity--full');
                        e.classList.remove('is-hovered');
                    });
                    gsap.set('html', { '--mainOpacity': 1 });
                    this.leaveProject("all");
                }
            });

            // Direct pointerenter on rows as instantaneous micro-optimization
            entries.forEach(row => {
                row.addEventListener('pointerenter', (e) => {
                    updateMousePosition(e.clientX, e.clientY);
                    this.checkHoverBounds(e.clientX, e.clientY);
                }, { passive: true });
            });
        }

        enterProject(key) {
            const projectData = PROJECTS.find(p => p.key === key);
            if (!projectData) return;

            const prevId = this.lastEnterKey;
            if (prevId) {
                this.leaveProject("last");
            }

            // Immediately purge any older groups in the queue (beyond prevId)
            if (this.queueMap.size > 1) {
                const toRemove = [];
                this.queueMap.forEach((group, id) => {
                    if (id !== prevId) toRemove.push(id);
                });
                toRemove.forEach(id => this.removeItem(id));
            }

            const presetRtt = this.noisePresets[this.presetProgress];
            const pGroup = new ProjectGroup(
                projectData,
                presetRtt,
                () => { if (prevId) this.removeItem(prevId); },
                window.innerWidth < 650 ? "mobile" : "desktop"
            );

            this.queueMap.set(pGroup.uuid, pGroup);
            this.lastEnterKey = pGroup.uuid;
            this.contentGroup.add(pGroup);
        }

        leaveProject(type) {
            if (type === "all") {
                this.lastEnterKey = null;
                this.presetProgress = (this.presetProgress + 1) % this.noisePresets.length;
                this.queueMap.forEach((pGroup, id) => {
                    pGroup.leave("all", () => this.removeItem(id));
                });
            } else if (type === "last" && this.lastEnterKey && this.queueMap.has(this.lastEnterKey)) {
                this.queueMap.get(this.lastEnterKey).leave("last");
            }
        }

        removeItem(id) {
            if (this.queueMap.has(id)) {
                const group = this.queueMap.get(id);
                group.destroy();
                this.contentGroup.remove(group);
                this.queueMap.delete(id);
            }
        }

        resize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.renderer.setSize(w, h);

            const dist = (h / Math.tan(this.camera.fov * Math.PI / 360)) * 0.5;
            this.camera.position.z = dist;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();

            if (!this.tracker) this.tracker = document.querySelector('.projects__gl');
            const rect = this.tracker ? this.tracker.getBoundingClientRect() : { width: Math.min(1000, w * 0.52), height: 600 };
            const scaleW = rect.width > 100 ? rect.width : (w >= 650 ? Math.min(1000, w * 0.52) : w * 0.85);
            
            this.size.w = scaleW;
            this.size.h = scaleW * (9 / 16);

            this.contentGroup.scale.x = this.size.w;
            this.contentGroup.scale.y = this.size.w;

            if (window.innerWidth < 650) {
                this.contentGroup.position.y = 30;
            } else {
                this.contentGroup.position.y = 0;
            }
            this.contentGroup.position.x = 0;
        }

        animate() {
            requestAnimationFrame(this.animate);

            const delta = this.clock.getDelta();
            this.timeElapsed += delta;

            // Continual real-time hover check during rapid scroll, momentum scroll & idle cursor states
            if (this.checkHoverBounds && this.isMouseInViewport && this.lastMouseX !== null && this.lastMouseY !== null) {
                this.checkHoverBounds(this.lastMouseX, this.lastMouseY);
            }

            // Lerp mouse
            this.mouse.smooth.x += (this.mouse.target.x - this.mouse.smooth.x) * 0.045;
            this.mouse.smooth.y += (this.mouse.target.y - this.mouse.smooth.y) * 0.045;
            this.speed = this.mouse.smooth.x - this.mouse.prev;
            this.mouse.prev = this.mouse.smooth.x;

            for (let i = 0; i < 4; i++) {
                this.floatYArr[i] = P3(this.timeElapsed * 0.5 + i);
            }

            // Animate queue items
            this.queueMap.forEach(group => {
                group.animate(this.floatYArr, this.mouse.smooth);
            });

            // Authentic Robert Borghesi mouse parallax & tilt on content group
            const baseY = window.innerWidth < 650 ? 30 : 0;
            this.contentGroup.position.x = this.mouse.smooth.x * (0.15 * this.size.w);
            this.contentGroup.position.y = baseY + this.mouse.smooth.y * (0.03 * this.size.h);
            this.contentGroup.rotation.y = this.mouse.smooth.x * 0.3;
            this.contentGroup.rotation.x = this.mouse.smooth.y * -0.15;
            this.contentGroup.rotation.z = this.speed;

            this.renderer.render(this.scene, this.camera);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { window.robertGL = new RobertSelectedProjectsGL(); });
    } else {
        window.robertGL = new RobertSelectedProjectsGL();
    }
})();
