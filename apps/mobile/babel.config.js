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
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
