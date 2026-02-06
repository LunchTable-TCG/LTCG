import { WebpackOverrideFn } from "@remotion/bundler";

export const webpackOverride: WebpackOverrideFn = (currentConfiguration) => {
  return {
    ...currentConfiguration,
    module: {
      ...currentConfiguration.module,
      rules: [
        ...(currentConfiguration.module?.rules ?? []),
        {
          test: /\.(png|jpg|jpeg|gif|svg|mp4|webm|mp3|wav)$/,
          type: "asset/resource",
        },
      ],
    },
  };
};
