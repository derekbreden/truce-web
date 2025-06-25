export default [
	{
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: "module",
			globals: {
				console: "readonly",
				window: "readonly"
			}
		},
		rules: {
			"semi": ["error", "never"],
			"quotes": ["error", "double", {
				"allowTemplateLiterals": true
			}],
			"eqeqeq": ["error", "always"],
			"prefer-arrow-callback": "error",
			"func-style": ["error", "expression"],
			"operator-linebreak": ["error", "before", {
				"overrides": {
					"=": "after",
					"+=": "after",
					"-=": "after",
					"*=": "after",
					"/=": "after"
				}
			}],
			"indent": ["error", "tab"],
		}
	}
]