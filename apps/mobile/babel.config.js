module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            '@': '../../src',
            '@app': '../../src/app',
            '@shared': '../../src/shared',
            '@entities': '../../src/entities',
            '@features': '../../src/features',
            '@mobile': './src',
            '@core': '../../packages/core/src',
            '@patient-documents': '../../src/domains/patient-documents',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
