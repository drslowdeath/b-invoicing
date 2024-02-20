module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "jquery": true
    },
    "extends": "eslint:recommended",
    
    "plugins": 
    [
        "jquery",
        "@html-eslint"
    ],
    
    "overrides": [
        {
            "files": ["*.html"],
            "parser": "@html-eslint/parser",
            "parserOptions": {
                "sourceType": "script"
            },
            "extends": [
                "plugin:@html-eslint/recommended",
                "plugin:jquery/deprecated"
            ],
            "rules": {
                "@html-eslint/indent": "error",
                "@html-eslint/no-multiple-h1": "off",
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
    },
    "rules": {
    }
};
