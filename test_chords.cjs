const fs = require('fs');
const appJs = fs.readFileSync('cms/app.js', 'utf8');

// We just want to extract nudgeChord and moveChordAbsolute and test them
function testNudge() {
  let textareaVal = "He[C]llo [Am]world";
  // mock DOM
  global.document = {
    getElementById: (id) => {
      if (id === 'chordpro-textarea') return { 
        get value() { return textareaVal; },
        set value(v) { textareaVal = v; },
        dispatchEvent: () => {}
      };
      return null;
    }
  };
  global.Event = class {};

  eval(appJs.match(/function nudgeChord[\s\S]*?textarea\.dispatchEvent\(new Event\('input'\)\);\n}/)[0]);
  
  nudgeChord(0, 1, -1); // move [Am] left
  console.log("After left nudge:", textareaVal);
  nudgeChord(0, 1, 1); // move [Am] right
  console.log("After right nudge:", textareaVal);
}

testNudge();

function testMove() {
  let textareaVal = "He[C]llo [Am]world";
  global.document = {
    getElementById: (id) => {
      if (id === 'chordpro-textarea') return { 
        get value() { return textareaVal; },
        set value(v) { textareaVal = v; },
        dispatchEvent: () => {}
      };
      return null;
    }
  };

  eval(appJs.match(/function moveChordAbsolute[\s\S]*?textarea\.dispatchEvent\(new Event\('input'\)\);\n}/)[0]);
  
  // Move [Am] (sourceChordIdx=1) to beginning of line (rawOffset=0)
  moveChordAbsolute(0, 1, 0, 0); 
  console.log("After move to 0:", textareaVal);
  
  // Move [C] (sourceChordIdx=1 since Am is now first) to rawOffset = length
  moveChordAbsolute(0, 1, 0, textareaVal.length);
  console.log("After move to end:", textareaVal);
}

testMove();
