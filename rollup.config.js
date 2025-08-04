// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser'; // <-- This is the correct import
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/chatbot.js',
  output: {
    file: 'dist/chatbot.bundle.js',
    format: 'iife',
    name: 'ChatbotWidget',
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    postcss({
      extract: false,
      inject: true,
      minimize: true,
    }),
    terser(), // <-- This is the correct plugin call
  ],
};