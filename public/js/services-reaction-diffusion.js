/**
 * Services Section ("What We Do"):
 * Pure Monochrome High-Contrast Matrix & Micro-Capsule Generative Canvas
 * - NO flat boundary cutoff lines (1.35x cover bleed ensures ribbons extend continuously beyond canvas)
 * - Organic undulating dither dissolve at both top (entry) and bottom (exit)
 * - 100% Pure Monochrome (crisp glowing white, sleek silver, deep black - ZERO colors)
 * - Enhanced contrast and luminosity dynamic range for striking visual appeal
 * - Authentic Micro-Capsule glyphs (hollow loops '0', arches '∩', micro-dots '•')
 * - Living organic scripted wave & flutter motion
 * - Responsive interactive cursor repulsion
 * - NO circular cursor placeholder
 */
(function() {
    'use strict';

    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
            if (typeof r === 'undefined') r = 0;
            if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
            this.beginPath();
            this.moveTo(x + r.tl, y);
            this.lineTo(x + w - r.tr, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
            this.lineTo(x + w, y + h - r.br);
            this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
            this.lineTo(x + r.bl, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
            this.lineTo(x, y + r.tl);
            this.quadraticCurveTo(x, y, x + r.tl, y);
            this.closePath();
            return this;
        };
    }

    const REF_W = 1024;
    const REF_H = 515;

    const BLOBS = [[0.3477, 0.9903, 0.3477, 0.9981, 0.3867, 0.9981, 0.3867, 0.9922, 0.3828, 0.9825, 0.3545, 0.9825], [0.9453, 0.9883, 0.9453, 0.9981, 0.9697, 0.9981, 0.9688, 0.9883, 0.9629, 0.9806, 0.9482, 0.9825], [0.1592, 0.9903, 0.1592, 0.9981, 0.2529, 0.9981, 0.25, 0.9748, 0.2432, 0.9515, 0.2344, 0.934, 0.2207, 0.9204, 0.1875, 0.9204, 0.167, 0.9515, 0.1641, 0.9612, 0.1641, 0.9767], [0.5801, 0.9883, 0.5801, 0.9981, 0.6621, 0.9981, 0.6621, 0.967, 0.6562, 0.9359, 0.6416, 0.9126, 0.6152, 0.9107, 0.6104, 0.9204, 0.6055, 0.9223, 0.5928, 0.9456], [0.0, 0.8932, 0.0, 0.9981, 0.0977, 0.9981, 0.0967, 0.9903, 0.0791, 0.9553, 0.0732, 0.9515, 0.0596, 0.9301, 0.0439, 0.9184, 0.0391, 0.9107, 0.0186, 0.899, 0.0107, 0.899, 0.0049, 0.8932], [0.3115, 0.8718, 0.3047, 0.8777, 0.2939, 0.899, 0.2939, 0.9417, 0.3066, 0.965, 0.3193, 0.967, 0.3291, 0.9573, 0.3369, 0.9417, 0.3408, 0.9204, 0.3408, 0.9049, 0.3301, 0.8796, 0.3223, 0.8718], [0.2344, 0.7126, 0.2178, 0.7379, 0.209, 0.7748, 0.209, 0.8233, 0.2109, 0.8369, 0.2285, 0.8738, 0.2441, 0.8854, 0.2637, 0.8874, 0.2725, 0.8835, 0.2754, 0.8777, 0.2822, 0.8738, 0.293, 0.8524, 0.2939, 0.8408, 0.2998, 0.8252, 0.3018, 0.7981, 0.2998, 0.7728, 0.2949, 0.7534, 0.2803, 0.7223, 0.2734, 0.7126, 0.2666, 0.7126, 0.2627, 0.7068, 0.2441, 0.7068, 0.2402, 0.7126], [0.1455, 0.633, 0.1221, 0.6311, 0.1133, 0.635, 0.1094, 0.6408, 0.1045, 0.6408, 0.0996, 0.6505, 0.0947, 0.6524, 0.082, 0.6757, 0.0791, 0.6913, 0.0723, 0.7068, 0.0693, 0.7398, 0.0703, 0.7961, 0.0752, 0.8078, 0.0752, 0.8175, 0.0928, 0.8505, 0.0957, 0.8505, 0.1016, 0.8583, 0.123, 0.866, 0.1523, 0.8505, 0.1699, 0.8175, 0.1826, 0.7631, 0.1836, 0.7165, 0.1797, 0.6893, 0.1631, 0.6505], [0.0088, 0.6, 0.0, 0.6, 0.0, 0.7806, 0.0068, 0.7786, 0.0098, 0.7728, 0.0166, 0.7709, 0.0205, 0.7631, 0.0264, 0.7612, 0.0332, 0.7456, 0.042, 0.7107, 0.041, 0.6524, 0.0303, 0.6252, 0.0215, 0.6097, 0.0156, 0.6097], [0.2148, 0.5806, 0.208, 0.5883, 0.2002, 0.6058, 0.2002, 0.6447, 0.2041, 0.6544, 0.209, 0.6563, 0.2129, 0.6641, 0.2305, 0.6641, 0.2412, 0.6408, 0.2432, 0.6291, 0.2422, 0.6058, 0.2334, 0.5864, 0.2295, 0.5825], [0.5684, 0.5786, 0.5625, 0.5786, 0.5576, 0.5709, 0.5381, 0.5709, 0.5205, 0.5883, 0.5059, 0.6214, 0.5059, 0.633, 0.5029, 0.6408, 0.5029, 0.6854, 0.5078, 0.7049, 0.5078, 0.7126, 0.5234, 0.7553, 0.5234, 0.767, 0.5254, 0.7728, 0.5234, 0.7825, 0.5234, 0.8, 0.5195, 0.8136, 0.5146, 0.8175, 0.5117, 0.8252, 0.5029, 0.8272, 0.4961, 0.8369, 0.4844, 0.8369, 0.4766, 0.8447, 0.4639, 0.8485, 0.459, 0.8583, 0.4531, 0.8583, 0.4482, 0.868, 0.4453, 0.868, 0.4316, 0.8932, 0.4248, 0.9184, 0.4238, 0.9417, 0.4248, 0.9631, 0.4277, 0.9709, 0.4277, 0.9786, 0.4336, 0.9903, 0.4336, 0.9981, 0.5137, 0.9981, 0.5146, 0.9922, 0.585, 0.8505, 0.5889, 0.833, 0.5957, 0.8194, 0.5967, 0.8097, 0.6016, 0.7961, 0.6016, 0.7883, 0.6045, 0.7786, 0.6045, 0.7612, 0.6064, 0.7553, 0.6045, 0.7359, 0.6045, 0.6951, 0.5996, 0.6718, 0.5996, 0.6583, 0.5938, 0.6408, 0.5908, 0.6233, 0.5781, 0.5942], [0.9844, 0.4757, 0.9814, 0.4835, 0.9756, 0.4874, 0.9668, 0.501, 0.9668, 0.5573, 0.9795, 0.5825, 0.9912, 0.5864, 0.9941, 0.5922, 0.999, 0.5942, 0.999, 0.4738], [0.2822, 0.4427, 0.2676, 0.4699, 0.2627, 0.4932, 0.2598, 0.499, 0.2598, 0.5515, 0.2627, 0.5592, 0.2627, 0.5689, 0.2676, 0.5883, 0.292, 0.6369, 0.3037, 0.6485, 0.3242, 0.6893, 0.334, 0.7223, 0.3359, 0.7456, 0.3457, 0.7864, 0.3457, 0.7961, 0.3516, 0.8175, 0.3643, 0.8427, 0.3779, 0.8544, 0.3984, 0.8563, 0.4082, 0.8505, 0.4121, 0.8427, 0.416, 0.8408, 0.4326, 0.8019, 0.4375, 0.7748, 0.4365, 0.7262, 0.4268, 0.6874, 0.4219, 0.6796, 0.4189, 0.666, 0.3926, 0.6155, 0.3857, 0.5981, 0.377, 0.5612, 0.3701, 0.5476, 0.3701, 0.5398, 0.3584, 0.4971, 0.3457, 0.4641, 0.3438, 0.4641, 0.333, 0.4447, 0.3281, 0.4447, 0.3203, 0.433, 0.2949, 0.433, 0.2871, 0.4427], [0.0732, 0.3981, 0.0605, 0.3981, 0.0576, 0.4019, 0.0469, 0.4019, 0.042, 0.4058, 0.0264, 0.433, 0.0225, 0.4524, 0.0176, 0.4641, 0.0176, 0.5165, 0.0215, 0.5243, 0.0225, 0.5359, 0.0391, 0.567, 0.0664, 0.5825, 0.0723, 0.5767, 0.0898, 0.5709, 0.1035, 0.5476, 0.1143, 0.5126, 0.1143, 0.468, 0.1094, 0.4447, 0.1006, 0.4233, 0.0889, 0.4058], [0.166, 0.3612, 0.1484, 0.3806, 0.1436, 0.3903, 0.1436, 0.3961, 0.1377, 0.4136, 0.1377, 0.4272, 0.1357, 0.433, 0.1377, 0.4874, 0.1475, 0.5165, 0.1611, 0.5398, 0.1797, 0.5515, 0.1855, 0.5515, 0.2041, 0.5398, 0.21, 0.532, 0.2217, 0.5068, 0.2295, 0.4738, 0.2295, 0.4291, 0.2236, 0.4039, 0.209, 0.3728, 0.2031, 0.3709, 0.1953, 0.3612], [0.2529, 0.3087, 0.2471, 0.3204, 0.2422, 0.3379, 0.2422, 0.3612, 0.2471, 0.3728, 0.2471, 0.3825, 0.2549, 0.3961, 0.2637, 0.4, 0.2822, 0.3961, 0.293, 0.3728, 0.2949, 0.3612, 0.2949, 0.3417, 0.293, 0.332, 0.2832, 0.3087, 0.2764, 0.3029, 0.2617, 0.301, 0.2559, 0.3087], [0.0039, 0.2971, 0.0, 0.2971, 0.0, 0.3728, 0.0039, 0.3709, 0.0078, 0.3631, 0.0107, 0.3476, 0.0107, 0.3146], [0.375, 0.2738, 0.3652, 0.2777, 0.3594, 0.2874, 0.3564, 0.2874, 0.3516, 0.299, 0.3506, 0.3068, 0.3457, 0.3146, 0.3447, 0.3612, 0.3457, 0.3709, 0.3564, 0.3981, 0.3594, 0.3981, 0.3643, 0.4078, 0.3809, 0.4136, 0.3975, 0.4058, 0.4102, 0.3825, 0.4121, 0.367, 0.416, 0.3573, 0.415, 0.3262, 0.4111, 0.3087, 0.4023, 0.2893, 0.3936, 0.2777], [0.7129, 0.2524, 0.707, 0.2641, 0.707, 0.2796, 0.7129, 0.2932, 0.7217, 0.2932, 0.7266, 0.2854, 0.7285, 0.2699, 0.7217, 0.2524], [0.0674, 0.1748, 0.0508, 0.2, 0.0439, 0.2233, 0.0439, 0.2699, 0.0518, 0.2971, 0.0518, 0.3029, 0.0664, 0.3243, 0.0732, 0.3262, 0.0801, 0.334, 0.0928, 0.334, 0.1104, 0.3223, 0.1211, 0.301, 0.1279, 0.2757, 0.1289, 0.2485, 0.124, 0.2175, 0.1084, 0.1825, 0.1016, 0.1748, 0.0938, 0.1748, 0.0889, 0.1709, 0.0752, 0.1709, 0.0732, 0.1748], [0.1758, 0.1553, 0.1602, 0.1786, 0.1533, 0.2039, 0.1533, 0.2466, 0.1562, 0.2544, 0.1562, 0.2621, 0.1758, 0.301, 0.1904, 0.3049, 0.21, 0.301, 0.2295, 0.2602, 0.2324, 0.2369, 0.2324, 0.2175, 0.2295, 0.2, 0.2227, 0.1806, 0.208, 0.1553], [0.291, 0.1243, 0.2871, 0.132, 0.2812, 0.134, 0.2686, 0.1612, 0.2686, 0.1689, 0.2656, 0.1767, 0.2656, 0.1864, 0.2637, 0.1922, 0.2637, 0.2194, 0.2686, 0.2388, 0.2686, 0.2466, 0.2812, 0.2738, 0.2881, 0.2757, 0.291, 0.2816, 0.3076, 0.2874, 0.3242, 0.2816, 0.3281, 0.2738, 0.334, 0.2718, 0.3389, 0.2641, 0.3447, 0.2485, 0.3496, 0.2194, 0.3506, 0.1903, 0.3486, 0.1845, 0.3486, 0.1728, 0.3408, 0.1476, 0.334, 0.134, 0.3291, 0.132, 0.3252, 0.1243], [0.7939, 0.0, 0.7939, 0.0194, 0.8047, 0.0583, 0.8047, 0.0718, 0.8145, 0.0893, 0.8154, 0.099, 0.8242, 0.1087, 0.8281, 0.1184, 0.8389, 0.1282, 0.8555, 0.132, 0.9062, 0.1301, 0.9102, 0.1359, 0.918, 0.1398, 0.9219, 0.1476, 0.9287, 0.1515, 0.9336, 0.1631, 0.9346, 0.1728, 0.9443, 0.1942, 0.9453, 0.2058, 0.9502, 0.2175, 0.9512, 0.2369, 0.9551, 0.2447, 0.9561, 0.2583, 0.96, 0.266, 0.9609, 0.2777, 0.9658, 0.2893, 0.9658, 0.299, 0.9717, 0.3107, 0.9717, 0.3204, 0.9756, 0.3282, 0.9766, 0.3398, 0.9805, 0.3456, 0.9814, 0.3612, 0.9941, 0.3864, 0.999, 0.3883, 0.999, 0.134, 0.9951, 0.134, 0.9932, 0.1301, 0.9932, 0.1204, 0.9902, 0.1126, 0.9893, 0.099, 0.9854, 0.0913, 0.9844, 0.0757, 0.9785, 0.068, 0.9658, 0.0388, 0.9629, 0.0369, 0.9551, 0.0194, 0.9482, 0.0194, 0.9404, 0.0078, 0.9014, 0.0078, 0.8975, 0.0175, 0.8711, 0.0194, 0.8662, 0.0078, 0.8604, 0.0058, 0.8604, 0.0], [0.6318, 0.0, 0.6328, 0.033, 0.6348, 0.0427, 0.6455, 0.0641, 0.6592, 0.068, 0.6689, 0.0621, 0.6768, 0.0466, 0.6777, 0.035, 0.6807, 0.0272, 0.6807, 0.0], [0.5283, 0.0, 0.5283, 0.0194, 0.5332, 0.0408, 0.5361, 0.0757, 0.5488, 0.1126, 0.5625, 0.1359, 0.5762, 0.1417, 0.5898, 0.1359, 0.6074, 0.1029, 0.6123, 0.0718, 0.6123, 0.0369, 0.6094, 0.0291, 0.6074, 0.0], [0.3662, 0.0, 0.3662, 0.0816, 0.3721, 0.0893, 0.373, 0.1049, 0.377, 0.1146, 0.377, 0.1223, 0.3818, 0.1301, 0.3877, 0.1534, 0.4014, 0.1806, 0.4131, 0.1922, 0.417, 0.2019, 0.4238, 0.2039, 0.4326, 0.2214, 0.4385, 0.2233, 0.4434, 0.233, 0.4492, 0.235, 0.458, 0.2524, 0.4697, 0.266, 0.4814, 0.301, 0.4814, 0.334, 0.4756, 0.3592, 0.4648, 0.3786, 0.4629, 0.3883, 0.458, 0.3922, 0.4551, 0.4, 0.4482, 0.4039, 0.4375, 0.4233, 0.4189, 0.4641, 0.4199, 0.5379, 0.4316, 0.5728, 0.4385, 0.5748, 0.4424, 0.5825, 0.4512, 0.5864, 0.4668, 0.5864, 0.4756, 0.5825, 0.4795, 0.5748, 0.4863, 0.5728, 0.5146, 0.5165, 0.5166, 0.501, 0.5254, 0.4854, 0.5264, 0.4718, 0.5303, 0.4641, 0.5312, 0.4505, 0.5371, 0.4311, 0.5371, 0.4214, 0.541, 0.4117, 0.5488, 0.4078, 0.5518, 0.4019, 0.5527, 0.3903, 0.5469, 0.3786, 0.5527, 0.3689, 0.5635, 0.367, 0.5645, 0.3922, 0.5674, 0.3981, 0.5752, 0.3981, 0.5791, 0.3903, 0.5811, 0.3942, 0.5811, 0.4233, 0.5859, 0.435, 0.5859, 0.4641, 0.5908, 0.4757, 0.5918, 0.4971, 0.5957, 0.5049, 0.6006, 0.5262, 0.6064, 0.534, 0.6113, 0.5476, 0.626, 0.5748, 0.6289, 0.5748, 0.6357, 0.5845, 0.6475, 0.6078, 0.6484, 0.6194, 0.6543, 0.6311, 0.6543, 0.6427, 0.6572, 0.6485, 0.6592, 0.6621, 0.6592, 0.7883, 0.6641, 0.8175, 0.6641, 0.8291, 0.6689, 0.8485, 0.6689, 0.8583, 0.6729, 0.866, 0.6738, 0.8777, 0.6787, 0.8874, 0.6836, 0.9068, 0.7236, 0.9864, 0.7314, 0.9903, 0.7324, 0.9961, 0.8193, 0.9981, 0.8184, 0.9883, 0.8115, 0.9806, 0.8076, 0.967, 0.7988, 0.9515, 0.791, 0.9495, 0.7881, 0.9417, 0.7832, 0.9417, 0.7783, 0.9301, 0.7705, 0.9282, 0.7617, 0.9107, 0.7568, 0.9107, 0.7441, 0.8874, 0.7295, 0.8466, 0.7246, 0.8272, 0.7227, 0.8039, 0.7197, 0.7961, 0.7188, 0.7592, 0.7148, 0.7456, 0.7139, 0.6913, 0.709, 0.6738, 0.709, 0.6078, 0.7178, 0.5883, 0.7197, 0.5786, 0.7354, 0.5767, 0.7471, 0.5961, 0.752, 0.6175, 0.7529, 0.7379, 0.7578, 0.7573, 0.7578, 0.7864, 0.7627, 0.8039, 0.7627, 0.8175, 0.7656, 0.8272, 0.7676, 0.8466, 0.7803, 0.8738, 0.7969, 0.8796, 0.8086, 0.8738, 0.8184, 0.8524, 0.8184, 0.7922, 0.8125, 0.7748, 0.8115, 0.7612, 0.8076, 0.7534, 0.8066, 0.7398, 0.8027, 0.732, 0.8027, 0.7126, 0.7969, 0.6951, 0.7969, 0.6524, 0.7949, 0.6408, 0.7969, 0.6214, 0.792, 0.5922, 0.792, 0.5728, 0.7861, 0.5534, 0.7803, 0.5456, 0.7607, 0.5049, 0.7598, 0.4913, 0.75, 0.4641, 0.75, 0.4505, 0.748, 0.4427, 0.748, 0.4078, 0.7451, 0.3942, 0.7451, 0.3631, 0.7402, 0.3515, 0.7393, 0.3417, 0.7305, 0.3204, 0.7236, 0.3165, 0.7207, 0.3087, 0.7031, 0.3087, 0.6875, 0.3417, 0.6875, 0.3534, 0.6855, 0.3592, 0.6875, 0.3961, 0.6943, 0.4233, 0.6992, 0.4311, 0.7051, 0.4544, 0.71, 0.4621, 0.7109, 0.4757, 0.7139, 0.4835, 0.7139, 0.4971, 0.7109, 0.5146, 0.6982, 0.5359, 0.6816, 0.5359, 0.6787, 0.5282, 0.6729, 0.5282, 0.6641, 0.499, 0.6572, 0.4854, 0.6562, 0.4738, 0.6514, 0.4621, 0.6514, 0.4427, 0.6465, 0.4252, 0.6465, 0.3456, 0.6514, 0.3282, 0.6514, 0.3165, 0.6553, 0.3087, 0.6572, 0.2951, 0.6934, 0.2233, 0.6992, 0.2214, 0.708, 0.2039, 0.7158, 0.2, 0.7344, 0.2, 0.7451, 0.2155, 0.75, 0.2408, 0.7559, 0.2563, 0.7568, 0.268, 0.7627, 0.2854, 0.7627, 0.299, 0.7686, 0.3107, 0.7686, 0.3223, 0.7734, 0.3379, 0.7734, 0.3515, 0.7783, 0.3631, 0.7871, 0.4194, 0.7939, 0.4408, 0.7939, 0.4544, 0.7988, 0.4621, 0.8037, 0.4854, 0.8232, 0.5204, 0.833, 0.5243, 0.8379, 0.532, 0.8486, 0.534, 0.8574, 0.5417, 0.877, 0.5456, 0.8799, 0.5515, 0.8877, 0.5553, 0.9023, 0.5864, 0.9043, 0.6039, 0.9092, 0.6214, 0.9092, 0.6311, 0.9141, 0.6427, 0.9141, 0.6621, 0.9199, 0.6738, 0.9199, 0.6854, 0.9248, 0.7049, 0.9248, 0.7146, 0.9297, 0.7262, 0.9307, 0.7553, 0.9355, 0.767, 0.9355, 0.7864, 0.9561, 0.8291, 0.9551, 0.866, 0.9502, 0.8699, 0.9326, 0.8699, 0.9238, 0.8874, 0.918, 0.8893, 0.9141, 0.899, 0.9072, 0.9029, 0.9023, 0.9107, 0.8926, 0.9107, 0.8877, 0.899, 0.8848, 0.8971, 0.8809, 0.8874, 0.8809, 0.8757, 0.8848, 0.868, 0.8857, 0.8563, 0.8955, 0.8369, 0.9023, 0.8078, 0.9033, 0.7903, 0.9014, 0.7786, 0.9014, 0.7573, 0.8955, 0.7398, 0.8936, 0.7204, 0.8867, 0.7029, 0.8857, 0.6854, 0.8809, 0.6718, 0.8809, 0.6447, 0.8711, 0.6194, 0.8691, 0.6058, 0.8662, 0.6, 0.8604, 0.5981, 0.8564, 0.5903, 0.8291, 0.5903, 0.8213, 0.6078, 0.8213, 0.6524, 0.8252, 0.6621, 0.8262, 0.6816, 0.8408, 0.7126, 0.8418, 0.7243, 0.8467, 0.7359, 0.8467, 0.7437, 0.8525, 0.7573, 0.8525, 0.8, 0.8506, 0.8175, 0.8467, 0.8233, 0.8467, 0.8427, 0.8369, 0.8757, 0.8359, 0.9417, 0.8408, 0.9495, 0.8418, 0.9612, 0.8545, 0.9883, 0.874, 0.9903, 0.877, 0.9961, 0.8896, 0.9981, 0.8965, 0.9922, 0.9131, 0.9864, 0.916, 0.9806, 0.9287, 0.9767, 0.9326, 0.9689, 0.9395, 0.965, 0.9424, 0.9592, 0.9502, 0.9573, 0.9541, 0.9495, 0.9658, 0.9476, 0.9707, 0.9379, 0.9756, 0.9359, 0.9785, 0.9282, 0.9863, 0.9243, 0.9893, 0.9184, 0.999, 0.9184, 0.999, 0.8078, 0.9961, 0.8078, 0.9805, 0.7767, 0.9795, 0.765, 0.9746, 0.7476, 0.9746, 0.7204, 0.9697, 0.7029, 0.9697, 0.6777, 0.9639, 0.6621, 0.9639, 0.6505, 0.96, 0.6408, 0.958, 0.6272, 0.9541, 0.6194, 0.9531, 0.6058, 0.9473, 0.5961, 0.9424, 0.5748, 0.9385, 0.567, 0.9375, 0.5379, 0.9326, 0.5243, 0.9375, 0.5126, 0.9385, 0.4913, 0.9424, 0.4854, 0.9434, 0.4718, 0.9482, 0.4602, 0.9492, 0.4388, 0.9521, 0.4233, 0.9482, 0.3748, 0.9434, 0.3612, 0.9424, 0.3495, 0.9287, 0.3184, 0.9268, 0.3049, 0.9229, 0.2971, 0.9229, 0.2874, 0.918, 0.2777, 0.9121, 0.2583, 0.9111, 0.2485, 0.8945, 0.2136, 0.8887, 0.2058, 0.8857, 0.2058, 0.8809, 0.1961, 0.8584, 0.1961, 0.8555, 0.2039, 0.8516, 0.2058, 0.8467, 0.2155, 0.8438, 0.2291, 0.8408, 0.268, 0.8447, 0.2757, 0.8457, 0.2874, 0.8555, 0.3068, 0.8564, 0.3165, 0.8594, 0.3223, 0.8643, 0.3243, 0.8691, 0.3359, 0.8721, 0.3379, 0.8848, 0.367, 0.8945, 0.3767, 0.8984, 0.4019, 0.9023, 0.4078, 0.9053, 0.4388, 0.9033, 0.4524, 0.8926, 0.4738, 0.877, 0.4757, 0.8721, 0.4641, 0.8643, 0.4621, 0.8398, 0.4097, 0.8379, 0.3981, 0.834, 0.3903, 0.833, 0.3767, 0.8291, 0.3709, 0.8232, 0.3515, 0.8232, 0.3359, 0.8184, 0.3204, 0.8184, 0.301, 0.8125, 0.2796, 0.8135, 0.2621, 0.8076, 0.2485, 0.8076, 0.2388, 0.8027, 0.2272, 0.8018, 0.2175, 0.7666, 0.134, 0.7656, 0.1126, 0.7617, 0.1029, 0.7617, 0.0563, 0.7637, 0.0505, 0.7637, 0.035, 0.7617, 0.0291, 0.7607, 0.0, 0.7041, 0.0, 0.7041, 0.0718, 0.7012, 0.0796, 0.6992, 0.101, 0.6924, 0.1184, 0.6836, 0.132, 0.6709, 0.134, 0.668, 0.1417, 0.6562, 0.1437, 0.6533, 0.1515, 0.6484, 0.1553, 0.6406, 0.1553, 0.6318, 0.1728, 0.625, 0.1748, 0.6016, 0.2233, 0.6006, 0.235, 0.5869, 0.2621, 0.5869, 0.2796, 0.5898, 0.2854, 0.5859, 0.2932, 0.5859, 0.3087, 0.5898, 0.3165, 0.5811, 0.3262, 0.5801, 0.3476, 0.5771, 0.3476, 0.5742, 0.3398, 0.5625, 0.3379, 0.5527, 0.3184, 0.5527, 0.2971, 0.5576, 0.2854, 0.5586, 0.2602, 0.5576, 0.2291, 0.5547, 0.2136, 0.5518, 0.2078, 0.543, 0.2058, 0.542, 0.1942, 0.5381, 0.1864, 0.5322, 0.1825, 0.5273, 0.165, 0.5205, 0.1631, 0.5068, 0.134, 0.499, 0.132, 0.4961, 0.1243, 0.4912, 0.1243, 0.4863, 0.1126, 0.4785, 0.1107, 0.4678, 0.0893, 0.46, 0.0816, 0.4551, 0.0699, 0.4521, 0.068, 0.4492, 0.0602, 0.4482, 0.0447, 0.4434, 0.0291, 0.4434, 0.0], [0.1846, 0.0, 0.1846, 0.0214, 0.1895, 0.0408, 0.1895, 0.0485, 0.208, 0.0854, 0.2275, 0.099, 0.2422, 0.099, 0.2676, 0.0835, 0.2959, 0.0291, 0.3018, 0.0136, 0.3018, 0.0], [0.1084, 0.0019, 0.0977, 0.0233, 0.0928, 0.0447, 0.0928, 0.0777, 0.0967, 0.0932, 0.0967, 0.1029, 0.1084, 0.1262, 0.1152, 0.1282, 0.1191, 0.1359, 0.1289, 0.1379, 0.1367, 0.1301, 0.1465, 0.1282, 0.1562, 0.1087, 0.1572, 0.099, 0.1611, 0.0893, 0.1611, 0.0485, 0.1572, 0.0388, 0.1553, 0.0252, 0.1475, 0.0078, 0.1406, 0.0058, 0.1406, 0.0], [0.0518, 0.0, 0.0, 0.0, 0.0, 0.132, 0.0225, 0.1262, 0.0264, 0.1184, 0.0322, 0.1165, 0.0459, 0.0913, 0.0518, 0.068, 0.0537, 0.0427]];

    function initServicesCanvas() {
        const section = document.querySelector('.ll-section--services');
        if (!section) return;

        let canvas = document.getElementById('servicesDiffusionCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'servicesDiffusionCanvas';
            canvas.className = 'absolute inset-0 w-full h-full pointer-events-none';
            canvas.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;';
            section.style.position = 'relative';
            section.insertBefore(canvas, section.firstChild);
        }

        if (canvas._servicesActive) return;
        canvas._servicesActive = true;

        const ctx = canvas.getContext('2d', { alpha: true });
        let width = 0, height = 0, dpr = 1;
        let validCells = [];
        let drawW = 0, drawH = 0, offsetX = 0, offsetY = 0;

        function resize() {
            const rect = section.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.width = Math.round(rect.width * dpr);
            height = canvas.height = Math.round(rect.height * dpr);

            if (width <= 0 || height <= 0) return;

            // Fit ribbons with vertical breathing space matching reference Image 2
            // so the top and bottom ribbon ends dissolve naturally into the dark void
            // without ever hitting or being clipped by the canvas bounding edges.
            const padY = Math.max(50 * dpr, height * 0.11);
            const availH = Math.max(100 * dpr, height - padY * 2);
            const scale = Math.min((width * 0.96) / REF_W, availH / REF_H);
            drawW = REF_W * scale;
            drawH = REF_H * scale;
            offsetX = (width - drawW) / 2;
            offsetY = (height - drawH) / 2;

            // Generate offscreen collision mask for organic ribbon shapes
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = width;
            maskCanvas.height = height;
            const mCtx = maskCanvas.getContext('2d');
            mCtx.fillStyle = '#ffffff';
            mCtx.fillRect(0, 0, width, height);

            mCtx.fillStyle = '#000000';
            for (let b = 0; b < BLOBS.length; b++) {
                const blob = BLOBS[b];
                mCtx.beginPath();
                for (let i = 0; i < blob.length; i += 2) {
                    const px = offsetX + blob[i] * drawW;
                    const py = offsetY + blob[i + 1] * drawH;
                    if (i === 0) mCtx.moveTo(px, py);
                    else mCtx.lineTo(px, py);
                }
                mCtx.closePath();
                mCtx.fill();
            }

            const maskData = mCtx.getImageData(0, 0, width, height).data;

            // Pre-calculate valid matrix cells inside genuine ribbon boundaries
            validCells = [];
            const stepX = 7.0 * dpr;
            const stepY = 10.0 * dpr;
            const cols = Math.ceil(width / stepX);
            const rows = Math.ceil(height / stepY);

            for (let r = 0; r < rows; r++) {
                const py = Math.round(r * stepY);
                for (let c = 0; c < cols; c++) {
                    const px = Math.round(c * stepX);
                    const sampleX = Math.min(width - 1, Math.max(0, Math.round(px + stepX * 0.5)));
                    const sampleY = Math.min(height - 1, Math.max(0, Math.round(py + stepY * 0.5)));
                    const idx = (sampleY * width + sampleX) * 4;

                    // Keep particle if inside the genuine ribbon (mask > 128)
                    if (maskData[idx] > 128) {
                        validCells.push({
                            c: c,
                            r: r,
                            baseX: px,
                            baseY: py,
                            pHash: ((Math.sin(c * 37.1 + r * 83.7) * 43758.5453) % 1.0 + 1.0) % 1.0,
                            ditherNoise: ((Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1.0 + 1.0) % 1.0
                        });
                    }
                }
            }
        }

        resize();
        window.addEventListener('resize', resize);

        // Global mouse tracking for responsive interactive cursor repulsion
        let mouseX = -9999, mouseY = -9999;
        let targetMouseX = -9999, targetMouseY = -9999;
        let isHoveringSection = false;

        window.addEventListener('mousemove', (e) => {
            const rect = section.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
                isHoveringSection = true;
                targetMouseX = (e.clientX - rect.left) * dpr;
                targetMouseY = (e.clientY - rect.top) * dpr;
            } else {
                isHoveringSection = false;
                targetMouseX = -9999;
                targetMouseY = -9999;
            }
        });

        let time = 0;
        let isVisible = false;

        function getDissolveProgress() {
            const rect = section.getBoundingClientRect();
            const winH = window.innerHeight;

            if (rect.bottom <= 0 || rect.top >= winH) {
                isVisible = false;
                return 0;
            }
            isVisible = true;

            const zone = winH * 0.35;
            const entryProgress = Math.max(0, Math.min(1, (winH - rect.top) / zone));
            const exitProgress = Math.max(0, Math.min(1, rect.bottom / zone));

            return Math.max(0, Math.min(1, Math.min(entryProgress, exitProgress)));
        }

        function draw() {
            requestAnimationFrame(draw);

            const dissolve = getDissolveProgress();

            const webglCanvas = document.querySelector('.js-canvas');
            if (webglCanvas) {
                if (isVisible) {
                    webglCanvas.style.opacity = Math.max(0, 1 - dissolve * 1.6).toFixed(3);
                } else {
                    webglCanvas.style.opacity = '1';
                }
            }

            if (!isVisible || dissolve <= 0.001) return;

            time += 0.024; // Organic living motion speed

            if (isHoveringSection && targetMouseX > 0) {
                mouseX += (targetMouseX - mouseX) * 0.16;
                mouseY += (targetMouseY - mouseY) * 0.16;
            } else {
                mouseX += (-9999 - mouseX) * 0.1;
                mouseY += (-9999 - mouseY) * 0.1;
            }

            // 1. Clear background transparently (zero color mismatch against #1a1c1c site void)
            ctx.clearRect(0, 0, width, height);

            // 2. Render authentic micro-capsule particles inside genuine boundaries
            ctx.save();
            const glyphW = 3.2 * dpr;
            const glyphH = 5.8 * dpr;
            const radius = 1.3 * dpr;
            const cursorRadius = 135 * dpr;
            const transitionZone = 85.0 * dpr;

            ctx.lineWidth = 1.15 * dpr;

            const numCells = validCells.length;
            for (let i = 0; i < numCells; i++) {
                const cell = validCells[i];

                // Organic harmonic wave motion + random flutter
                const waveX = Math.sin(time * 1.8 + cell.baseY * 0.035 + cell.baseX * 0.02) * (2.0 * dpr);
                const waveY = Math.cos(time * 1.6 + cell.baseX * 0.035 + cell.baseY * 0.02) * (1.8 * dpr);
                const flutterX = Math.sin(time * 2.5 + cell.pHash * 6.28) * (1.0 * dpr);
                const flutterY = Math.cos(time * 2.2 + cell.pHash * 8.19) * (1.0 * dpr);

                let px = cell.baseX + waveX + flutterX;
                let py = cell.baseY + waveY + flutterY;

                // Organic undulating dissolve gradient at BOTH Start (Top) and End (Bottom)
                // Calculated relative to ribbon geometry boundaries so particles morph and dissolve organically
                const topWave = Math.sin(cell.baseX * 0.015 + time * 0.8) * (20 * dpr) + Math.cos(cell.baseX * 0.03) * (12 * dpr);
                const bottomWave = Math.sin(cell.baseX * 0.016 - time * 0.75) * (20 * dpr) + Math.cos(cell.baseX * 0.032) * (12 * dpr);

                const distFromTop = (py - offsetY) + topWave;
                const distFromBottom = (offsetY + drawH - py) + bottomWave;
                const edgeDist = Math.min(distFromTop, distFromBottom);

                let edgeProgress = 1.0;
                if (edgeDist < transitionZone) {
                    edgeProgress = Math.max(0, edgeDist / transitionZone);
                }

                const totalProgress = edgeProgress * dissolve;

                // Stochastic scanline/dither dropout matching Image 2 reference
                if (cell.ditherNoise > totalProgress * 1.3) continue;

                // Fluid Interactive Cursor Repulsion
                let cursorGlow = 0;
                if (mouseX > -1000) {
                    const dx = px - mouseX;
                    const dy = py - mouseY;
                    const dist = Math.hypot(dx, dy);
                    if (dist < cursorRadius && dist > 0.01) {
                        const factor = 1 - dist / cursorRadius;
                        const force = factor * factor * (30 * dpr);
                        px += (dx / dist) * force;
                        py += (dy / dist) * force;
                        cursorGlow = factor * 0.7;
                    }
                }

                // PURE MONOCHROME HIGH CONTRAST (Deep Grey, Black, Radiant Crisp White - ZERO Colors)
                const lumWave = 0.5 + 0.5 * Math.sin(time * 2.2 + cell.baseX * 0.014 + cell.baseY * 0.02);
                // Enhanced contrast curve: deep silver (170) to punchy glowing white (255)
                let lum = Math.round(170 + 85 * Math.pow(lumWave, 1.35));
                let alpha = Math.min(1.0, (0.58 + 0.42 * Math.pow(lumWave, 1.2)) * totalProgress + cursorGlow);

                if (cursorGlow > 0) {
                    lum = 255;
                    alpha = Math.min(1.0, alpha + cursorGlow * 0.5);
                }

                if (alpha < 0.025) continue;

                const strokeStr = 'rgba(' + lum + ',' + lum + ',' + lum + ',' + (alpha * 0.96).toFixed(3) + ')';
                ctx.strokeStyle = strokeStr;
                ctx.fillStyle = strokeStr;

                if (totalProgress > 0.65) {
                    // Full hollow capsule '0' (Image 2 reference)
                    ctx.beginPath();
                    ctx.roundRect(px, py, glyphW, glyphH, radius);
                    ctx.stroke();
                } else if (totalProgress > 0.3) {
                    // Arch / half capsule '∩' (transition stage)
                    ctx.beginPath();
                    ctx.moveTo(px, py + glyphH * 0.55);
                    ctx.lineTo(px, py + radius);
                    ctx.arcTo(px, py, px + radius, py, radius);
                    ctx.arcTo(px + glyphW, py, px + glyphW, py + radius, radius);
                    ctx.lineTo(px + glyphW, py + glyphH * 0.55);
                    ctx.stroke();
                } else {
                    // Micro dot or delicate hanging tick '•' / '|' (dissolving into void matching ref_bottom.png)
                    ctx.fillRect(px + glyphW * 0.3, py, Math.max(1.0, 1.2 * dpr), glyphH * 0.45);
                }
            }
            ctx.restore();
        }

        requestAnimationFrame(draw);
    }

    function attachServicesRouterHooks() {
        const router = window.$?.instances?.get('router');
        if (router?.swup?.hooks) {
            router.swup.hooks.on('page:view', () => setTimeout(initServicesCanvas, 60));
            router.swup.hooks.on('content:replace', () => setTimeout(initServicesCanvas, 60));
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initServicesCanvas();
            attachServicesRouterHooks();
        });
    } else {
        initServicesCanvas();
        attachServicesRouterHooks();
    }

    window.addEventListener('popstate', () => setTimeout(initServicesCanvas, 100));

    window.__servicesEngine = {
        init: initServicesCanvas
    };
})();
