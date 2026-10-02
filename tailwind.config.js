export default {
  // Tailwind is used ONLY by the web app, so the landing page styles stay untouched.
  content: ['./src/web-app/**/*.{ts,tsx}'],
  theme: { extend: { colors: { brand: '#0F3D2F', gold: '#E8C468', cash: '#2F8A55', upi: '#5F259F', paper: '#F8FAFC' } } },
  plugins: [],
};
