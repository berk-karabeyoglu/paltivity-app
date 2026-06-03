const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable package exports resolution to avoid .mjs files with webpack magic comments
// (e.g. @supabase/supabase-js uses /* webpackIgnore: true */ in its .mjs build)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
