const fs = require('fs');

let html = fs.readFileSync('./public/index.html', 'utf-8');

// Target snippet around 1695-1701:
const target = `                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-start-1 col-span-6 mt-auto lg:col-start-1 lg:col-span-7">`;

const replacement = `                                        </button>
                                    </div>
                                </div>

                        <div class="col-start-1 col-span-6 mt-auto lg:col-start-1 lg:col-span-7">`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  console.log('Successfully replaced snippet!');
} else {
  console.log('Target snippet not found exactly, searching with regex...');
  html = html.replace(/<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="col-start-1/g, '</button>\n                                    </div>\n                                </div>\n\n                        <div class="col-start-1');
}

fs.writeFileSync('./public/index.html', html);

// Now count depth before </main>
const scrollerStart = html.indexOf('class="ll-scroller');
const mainEnd = html.indexOf('</main>');

let depth = 0;
const tagRegex = /<\/?div[^>]*>/gi;
tagRegex.lastIndex = scrollerStart;

let match;
while ((match = tagRegex.exec(html)) !== null && match.index < mainEnd) {
  const tag = match[0];
  if (tag.startsWith('</')) depth--;
  else if (!tag.endsWith('/>')) depth++;
}

console.log('New div depth right before </main>:', depth);
