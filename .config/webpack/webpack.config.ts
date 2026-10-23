import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import { SubresourceIntegrityPlugin } from 'webpack-subresource-integrity';
import webpack, { type Configuration } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

import { BuildModeWebpackPlugin } from './BuildModeWebpackPlugin.ts';
import { DIST_DIR, SOURCE_DIR } from '../bundler/constants.ts';
import { getCPConfigVersion, getEntries, getPackageJson, getPluginJson, isWSL } from '../bundler/utils.ts';
import { externals } from '../bundler/externals.ts';
import { copyFilePatterns } from '../bundler/copyFiles.ts';

const pluginJson = getPluginJson();
const cpVersion = getCPConfigVersion();
const pluginVersion = getPackageJson().version;
const today = new Date().toISOString().substring(0, 10);

const virtualPublicPath = new VirtualModulesPlugin({
  'node_modules/grafana-public-path.js': `
import amdMetaModule from 'amd-module';

__webpack_public_path__ =
  amdMetaModule && amdMetaModule.uri
    ? amdMetaModule.uri.slice(0, amdMetaModule.uri.lastIndexOf('/') + 1)
    : 'public/plugins/${pluginJson.id}/';
`,
});

export type Env = {
  [key: string]: true | string | Env;
};

const replaceTemplateVars = (content: Buffer): string =>
  content
    .toString('utf8')
    .replace(/%VERSION%/g, pluginVersion)
    .replace(/%TODAY%/g, today)
    .replace(/%PLUGIN_ID%/g, pluginJson.id);

const config = async (env: Env): Promise<Configuration> => {
  const patternsWithTransform = copyFilePatterns.map((pattern) => {
    if (pattern.to === '.' || pattern.from === 'plugin.json' || pattern.from.endsWith('README.md')) {
      return {
        ...pattern,
        transform: (content: Buffer, absoluteFrom: string) => {
          if (absoluteFrom.endsWith('plugin.json') || absoluteFrom.endsWith('README.md')) {
            return replaceTemplateVars(content);
          }
          return content;
        },
      };
    }
    return pattern;
  });

  const baseConfig: Configuration = {
    cache: {
      type: 'filesystem',
      name: `${pluginJson.id}-${env.production ? 'prod' : 'dev'}`,
      buildDependencies: {
        config: [path.resolve(process.cwd(), '.config', 'webpack', 'webpack.config.ts')],
      },
    },

    context: path.join(process.cwd(), SOURCE_DIR),

    devtool: env.production ? 'source-map' : 'eval-source-map',

    entry: await getEntries(),

    externals,

    experiments: {
      asyncWebAssembly: true,
    },

    mode: env.production ? 'production' : 'development',

    module: {
      rules: [
        {
          test: /src\/(?:.*\/)?module\.tsx?$/,
          use: [
            {
              loader: 'imports-loader',
              options: {
                imports: `side-effects grafana-public-path`,
              },
            },
          ],
        },
        {
          exclude: /(node_modules)/,
          test: /\.[tj]sx?$/,
          use: {
            loader: 'swc-loader',
            options: {
              jsc: {
                baseUrl: path.resolve(process.cwd(), SOURCE_DIR),
                target: 'es2015',
                loose: false,
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                  decorators: false,
                  dynamicImport: true,
                },
              },
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: Boolean(env.production) ? '[hash][ext]' : '[file]',
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)(\?v=\d+\.\d+\.\d+)?$/,
          type: 'asset/resource',
          generator: {
            filename: Boolean(env.production) ? '[hash][ext]' : '[file]',
          },
        },
      ],
    },

    optimization: {
      minimize: Boolean(env.production),
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: (_, { type, value }) => type === 'comment2' && value.trim().startsWith('[create-plugin]'),
            },
            compress: {
              drop_console: ['log', 'info'],
            },
          },
        }),
      ],
    },

    output: {
      clean: {
        keep: new RegExp(`(.*?_(amd64|arm(64)?)(.exe)?|go_plugin_build_manifest)`),
      },
      filename: '[name].js',
      chunkFilename: env.production ? '[name].js?_cache=[contenthash]' : '[name].js',
      library: {
        type: 'amd',
      },
      path: path.resolve(process.cwd(), DIST_DIR),
      publicPath: `public/plugins/${pluginJson.id}/`,
      uniqueName: pluginJson.id,
      crossOriginLoading: 'anonymous',
    },

    plugins: [
      new BuildModeWebpackPlugin(),
      virtualPublicPath,
      new webpack.BannerPlugin({
        banner: `/* [create-plugin] version: ${cpVersion} */
          /* [create-plugin] plugin: ${pluginJson.id}@${pluginVersion} */`,
        raw: true,
        entryOnly: true,
      }),
      new CopyWebpackPlugin({
        patterns: patternsWithTransform,
      }),
      new SubresourceIntegrityPlugin({
        hashFuncNames: ['sha256'],
      }),
    ],

    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      modules: [path.resolve(process.cwd(), 'src'), 'node_modules'],
      unsafeCache: true,
    },
  };

  if (isWSL()) {
    baseConfig.watchOptions = {
      poll: 3000,
      ignored: /node_modules/,
    };
  }

  return baseConfig;
};

export default config;
