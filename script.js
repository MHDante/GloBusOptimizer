//Manipulates the Glo-Bus interface to produce multiple simulations for product design
//It can also optimize for a given metric
//More comments will be added later (Hopefully)


function kd(key) {
  return new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: key,
    code: key
  });
}

function ku(key) {
  return new KeyboardEvent("keyup", {
    bubbles: true,
    cancelable: true,
    key: key,
    code: key
  });
}

function flick(element, key) {
  element.dispatchEvent(kd(key));
  element.dispatchEvent(ku(key));
}

function Slider(element, radix = 1) {
  this.element = element;
  this.values = [];
  this.frozen = false;

  this.getValue = () => {
    return this.element.innerText.trim();
  };

  this.moveBy = delta => {
    if (this.frozen) return false;
    for (let i = 0; i < Math.abs(delta); i++) {
      var value = this.getValue();
      flick(this.element, delta > 0 ? "ArrowDown" : "ArrowUp");
      var newVal = this.getValue();
      if (newVal == value) return false;
    }
    return true;
  };

  this.moveTo = i => this.moveBy(i - this.getIndex());

  this.getIndex = () => this.values.indexOf(this.getValue());

  this.stringMap = () => {
    var res = "";
    for (let i = 0; i < this.values.length; i++) {
      res += `${i}\t${this.values[i]}\n`;
    }
    return res;
  };

  var initialValue = this.getValue();

  while (this.moveBy(1)) {}
  do {
    this.values.unshift(this.getValue());
  } while (this.moveBy(-1));

  this.moveTo(this.values.indexOf(initialValue));

  this.length = this.values.length;

  this.radix = radix;
}

function Section(div, scoreSelector, costSelector) {
  this.maxRadix = 1;
  let scoreDiv = div.querySelectorAll(scoreSelector)[0];
  let costDivs = div.querySelectorAll(costSelector);
  let divs = Array.from(div.querySelectorAll("glo-entry-select > [dropdown]"));

  //preserve r&d
  let last = divs.pop();
  //remove models
  divs.pop();
  divs.push(last);

  //create sliders
  this.sliders = divs.map(e => {
    var s = new Slider(e, this.maxRadix);
    this.maxRadix = this.maxRadix * s.length;
    return s;
  });

  this.getScore = () => scoreDiv.innerText.trim();
  this.buildPrice = () => costDivs[1].innerText.trim();
  this.totalPrice = () => costDivs[2].innerText.trim();

  this.valueArr = () => {
    return [
      this.getCode(),
      this.getScore(),
      this.buildPrice(),
      this.totalPrice()
    ];
  };
  this.valueString = () => {
    return this.valueArr().join("\t");
  };

  this.stringMap = () => {
    let res = "";
    this.sliders.forEach(s => {
      res += s.stringMap() + "\n";
    });
    return res;
  };

  this.setTo = code => {
    for (let i = 0; i < this.sliders.length; i++) {
      const s = this.sliders[i];
      var l = s.length;
      let val = code % l;
      code = (code - val) / l;
      s.moveTo(val);
    }

    if (code != 0) throw new Error("Math error");
  };

  this.getCode = () => {
    var code = 0;
    this.sliders.forEach(s => {
      code += s.radix * s.getIndex();
    });
    return code;
  };
}

// this will be an array of the big columns for each product
var bigbois = document.querySelectorAll(".product-design > .row > .span90");

let cameraSection = new Section(
  bigbois[0],
  ".ac-calc-area1 > .row > .span8 > .row",
  ".ac-calc-area2 > .row > .span12"
);
let uavSection = new Section(
  bigbois[1],
  ".uav-calc-area1 > .row > .span8 > .row",
  ".uav-calc-area2 > .row > .span12"
);

function rndInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
let result = [];
let interval = null;

function runMinimal(section, iterations) {
  var RnD = section.sliders[section.sliders.length - 1];

  RnD.frozen = true;

  var nums = new Array(iterations)
    .fill(0)
    .map(() => rndInt(0, RnD.radix))
    .sort((a, b) => a - b);

  performRun(nums, section, iterations);
}

function runFull(section, iterations) {
  var nums = new Array(iterations)
    .fill(0)
    .map(() => rndInt(0, section.maxRadix))
    .sort((a, b) => a - b);

  performRun(nums, section, iterations);
}

let vals = [];
let vs = [];

function descend(section, maxStars) {
  interval = setInterval(() => {
    if (!step(section, maxStars)) {
      clearInterval(interval);
      console.log("DONE");
    }
  });
}

function performRun(nums, section, iterations) {
  result = [];
  let progress = 0;
  var i = 0;

  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log("Cancelled previous operations!");
  }

  interval = setInterval(() => {
    let code = nums[i++];
    section.setTo(code);
    result.push(section.valueArr());
    progress += 1;
    if (progress % 100 == 0) console.log(`${progress}/${iterations} done.`);
    if (progress >= iterations) {
      clearInterval(interval);
      interval = null;
      console.log(result.map(a => a.join("\t")).join("\n"));
      var x = result.sort((a, b) => b[1] / b[3] - a[1] / a[3]);
      section.setTo(x[0][0]);
      descend(section, 5.4);
    }
  }, 0);
}

function step(section, maxStars) {
  console.log(section.valueString());
  //var RnD = section.sliders[section.sliders.length - 1];
  //RnD.frozen = true;

  let sliders = section.sliders.filter(s => !s.frozen);
  vals = [];

  let oldCost = parseFloat(section.totalPrice().replace(",", ""));
  collect(sliders, 0);

  let start = section.getCode();

  vs = vals.slice().sort((a, b) => b.goal - a.goal);
  if (vs[0].code == start) return false;
  section.setTo(vs[0].code);
  return true;

  function collect(sliders, i) {
    if (i < sliders.length) {
      let s = sliders[i];
      collect(sliders, i + 1);
      if (s.moveBy(1)) {
        collect(sliders, i + 1);
        s.moveBy(-1);
      }
      if (s.moveBy(-1)) {
        collect(sliders, i + 1);
        s.moveBy(1);
      }
    } else {
      let cost = parseFloat(section.totalPrice().replace(",", ""));
      let score = parseFloat(section.getScore().replace(",", ""));
      if (maxStars && maxStars < score && cost > oldCost) return;
      vals.push({
        code: section.getCode(),
        goal: score / cost
      });
      if (vals.length % 100 == 0) console.log(vals.length);
    }
  }
}

function freezeBot(section) {
  var RnD = section.sliders[section.sliders.length - 1];

  RnD.frozen = true;
}
