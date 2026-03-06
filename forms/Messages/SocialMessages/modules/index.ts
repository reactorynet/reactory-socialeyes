import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'socialeyes.MessageDetailPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.MessageDetailPanel.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.ConversationThread@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.ConversationThread.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.MessageReply@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.MessageReply.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.SocialMessagesToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../components/SocialMessagesToolbar.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;
