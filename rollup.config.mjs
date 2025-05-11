import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

export default {
   input: 'src/app.ts',
   output: {
       dir: 'dist',
       format: 'iife',
       sourcemap: true,
       entryFileNames: 'script.js',
       globals: {
        'redux': 'Redux',
        '@reduxjs/toolkit': 'ReduxToolkit'
    }
   },
   plugins: [
       nodeResolve(),
       commonjs(),
       typescript({
           tsconfig: './tsconfig.json',
           outDir: 'dist',
           include: ['src/**/*'],
           exclude: ['node_modules', 'dist']
       }),
       replace({
           'process.env.NODE_ENV': JSON.stringify('development'),
           preventAssignment: true,
       }),
   ],
};
