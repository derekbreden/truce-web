module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
        "semi": ["error", "never"],
        "quotes": ["error", "double"],
        "eqeqeq": ["error", "always"],
        "prefer-arrow-callback": "error",
        "func-style": ["error", "expression"],
        "max-len": ["error", { "code": 80 }],
        "operator-linebreak": ["error", "before", {
            "overrides": {
                "=": "after",
                "+=": "after",
                "-=": "after",
                "*=": "after",
                "/=": "after"
            }
        }]
    }
};