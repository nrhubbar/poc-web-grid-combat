 import typescript from '@rollup/plugin-typescript';
 
 export default {
    input: 'src/app.ts',
    output: {
        file: 'dist/script.js',
        format: 'cjs',
    },
    plugins: [typescript({
        tsconfig: './tsconfig.json',
    })],
 };
 