
// Precision Verification Script
// Ensures strict 2-decimal formatting (even for .00) matches the requirement.

const testValues = [
    { name: "Whole Number", val: 180479, expected: "$180,479.00" },
    { name: "One Decimal", val: 180479.5, expected: "$180,479.50" },
    { name: "High Precision", val: 21476.96123, expected: "$21,476.96" },
    { name: "Rounding Up", val: 79615.125, expected: "$79,615.13" },
    { name: "Repeating", val: 100.33333, expected: "$100.33" }
];

function formatCurrency(num) {
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let errors = 0;
console.log('--- PRECISION CHECK ---');

testValues.forEach(test => {
    const formatted = formatCurrency(test.val);
    if (formatted === test.expected) {
        console.log(`[PASS] ${test.name}: ${test.val} -> ${formatted}`);
    } else {
        console.error(`[FAIL] ${test.name}: Expected ${test.expected}, Got ${formatted}`);
        errors++;
    }
});

console.log('---');
if (errors === 0) {
    console.log('✅ STRICT 2-DECIMAL RULE VALIDATED');
} else {
    console.log(`❌ ${errors} FAILURES IN PRECISION`);
    process.exit(1);
}
