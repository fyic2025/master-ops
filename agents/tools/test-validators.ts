/**
 * Test script for Liquid, JS, and CSS validators
 * Run with: npx tsx agents/tools/test-validators.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import LiquidValidator from './liquid-validator';

async function runTests() {
  console.log('🧪 Testing Code Quality Validators\n');

  const validator = new LiquidValidator();
  const testDir = path.join(os.tmpdir(), 'theme-validator-test');

  // Setup test directory
  console.log('📁 Setting up test directory...');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir);
  fs.mkdirSync(path.join(testDir, 'templates'));
  fs.mkdirSync(path.join(testDir, 'sections'));
  fs.mkdirSync(path.join(testDir, 'assets'));

  // Test 1: Valid Liquid template
  console.log('\n✅ Test 1: Valid Liquid template');
  fs.writeFileSync(path.join(testDir, 'templates', 'index.liquid'), `
{% comment %}
  Homepage template
{% endcomment %}

<div class="homepage">
  {% if section.settings.show_hero %}
    <h1>{{ section.settings.title }}</h1>
  {% endif %}

  {% for product in collections.all.products limit: 4 %}
    <div class="product-card">
      <h3>{{ product.title }}</h3>
      <p>{{ product.price | money }}</p>
    </div>
  {% endfor %}
</div>

{% schema %}
{
  "name": "Homepage",
  "settings": [
    {
      "type": "checkbox",
      "id": "show_hero",
      "label": "Show hero section"
    },
    {
      "type": "text",
      "id": "title",
      "label": "Title"
    }
  ]
}
{% endschema %}
`);

  let result = await validator.validate({ themePath: testDir });
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Errors: ${result.summary.errorCount}, Warnings: ${result.summary.warningCount}`);

  // Test 2: Invalid Liquid - unclosed tag
  console.log('\n❌ Test 2: Invalid Liquid - unclosed if tag');
  fs.writeFileSync(path.join(testDir, 'sections', 'broken.liquid'), `
<div>
  {% if product.available %}
    <span>In Stock</span>
  {# Missing endif #}
</div>
`);

  result = await validator.validate({ themePath: testDir });
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Errors: ${result.summary.errorCount}`);
  if (result.errors.length > 0) {
    console.log(`   First error: ${result.errors[0].message}`);
  }

  // Test 3: Invalid Liquid - mismatched tags
  console.log('\n❌ Test 3: Invalid Liquid - mismatched tags');
  fs.writeFileSync(path.join(testDir, 'sections', 'mismatch.liquid'), `
{% for item in collection.products %}
  <div>{{ item.title }}</div>
{% endif %}
`);

  result = await validator.validate({ themePath: testDir });
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Errors: ${result.summary.errorCount}`);
  if (result.errors.length > 0) {
    for (const err of result.errors.slice(0, 3)) {
      console.log(`   • ${err.file}:${err.line} - ${err.message}`);
    }
  }

  // Test 4: Valid JavaScript
  console.log('\n✅ Test 4: Valid JavaScript');
  fs.writeFileSync(path.join(testDir, 'assets', 'theme.js'), `
(function() {
  const button = document.querySelector('.add-to-cart');

  if (button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      addToCart();
    });
  }

  function addToCart() {
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
})();
`);

  // Test 5: JavaScript with issues
  console.log('\n⚠️  Test 5: JavaScript with issues (console.log, debugger)');
  fs.writeFileSync(path.join(testDir, 'assets', 'debug.js'), `
function test() {
  console.log('Testing');
  debugger;
  return true;
}
`);

  // Test 6: Valid CSS
  console.log('\n✅ Test 6: Valid CSS');
  fs.writeFileSync(path.join(testDir, 'assets', 'theme.css'), `
.product-card {
  padding: 20px;
  margin-bottom: 10px;
  border: 1px solid #eee;
}

.product-card h3 {
  font-size: 18px;
  color: #333;
}
`);

  // Test 7: CSS with issues
  console.log('\n⚠️  Test 7: CSS with issues (empty value)');
  fs.writeFileSync(path.join(testDir, 'assets', 'broken.css'), `
.broken {
  color: ;
  padding: 10px;
}
`);

  // Run final validation
  console.log('\n📊 Final validation of test directory:');
  result = await validator.validate({ themePath: testDir });
  console.log(`   Total files checked: ${result.summary.totalFiles}`);
  console.log(`   Errors: ${result.summary.errorCount}`);
  console.log(`   Warnings: ${result.summary.warningCount}`);
  console.log(`   Overall: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

  // Format and display results
  console.log('\n📋 Formatted output:');
  const formatted = validator.formatResults(result);
  for (const line of formatted) {
    console.log(`   ${line}`);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  fs.rmSync(testDir, { recursive: true });

  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
