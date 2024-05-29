const range = document.getElementById('range');

const parseSlider = (elem) => {
  // Get the label (which is the nextElementSibling)
	const label = elem.nextElementSibling;
	// Get value of the input
	const value = +elem.value;
	// Get the width value of the input
	const range_width = getComputedStyle(elem).getPropertyValue('width');
	// Remove 'px' and conver to number
	const num_width = +range_width.substring(0, range_width.length - 2);
	// Get min and max values
	const max = +elem.max;
	const min = +elem.min;
	// Calculate the left value
	const left = (value - min) * (num_width / max) + scale(value, min, max, -6, 12);
	
	label.style.left = `${left}px`;
	label.innerHTML = value;
}

// From StackOverflow: https://stackoverflow.com/questions/10756313/javascript-jquery-map-a-range-of-numbers-to-another-range-of-numbers
const scale = (num, in_min, in_max, out_min, out_max) => {
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

parseSlider(range)

range.addEventListener('input', (e) => {
  parseSlider(e.target)
});