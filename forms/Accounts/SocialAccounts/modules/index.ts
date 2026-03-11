import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';
import path from 'path';

const modules: Reactory.Forms.IReactoryFormModule[] = [
  {
    compilerOptions: {},
    id: 'socialeyes.AccountDetailPanel@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.AccountDetailPanel.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.AccountOverview@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.AccountOverview.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.AccountListeners@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.AccountListeners.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.SocialAccountsToolbar@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../components/SocialAccountsToolbar.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.ConnectAccountDialog@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.ConnectAccountDialog.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.EditAccountDialog@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.EditAccountDialog.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
  {
    compilerOptions: {},
    id: 'socialeyes.CreateListenerDialog@1.0.0',
    src: fileAsString(path.resolve(__dirname, '../../../Widgets/socialeyes.CreateListenerDialog.tsx')),
    compiler: 'rollup',
    fileType: 'tsx'
  },
];

export default modules;
