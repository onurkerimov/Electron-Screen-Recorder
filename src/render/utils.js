// function getCurrentDisplay(x, y) {
//   return detectedDisplays.find(display => {
//     const { bounds } = display;

//     const x1 = bounds.x;
//     const x2 = x1 + bounds.width;
//     if (x < x1 || x2 < x) return false;

//     const y1 = bounds.y;
//     const y2 = y1 + bounds.height;
//     if (y < y1 || y2 < y) return false;

//     return true;
//   });
// }