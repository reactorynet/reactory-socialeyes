import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'socialeyes.FeedDetailPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.FeedDetailPanel.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.PostContent@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.PostContent.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.PostMetrics@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.PostMetrics.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.SocialFeedToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../components/SocialFeedToolbar.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;
