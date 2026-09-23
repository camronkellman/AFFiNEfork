import { IconEditor, IconRenderer } from '@affine/component';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { ExplorerIconService } from '@affine/core/modules/explorer-icon/services/explorer-icon';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { SmileSolidIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect } from 'react';

import * as styles from './doc-icon-picker.css';

const TitleContainer = ({
  children,
  hasIcon,
}: {
  children: React.ReactNode;
  hasIcon: boolean;
}) => {
  return (
    <div
      className="doc-icon-container"
      data-has-icon={hasIcon ? 'true' : 'false'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        paddingBottom: 8,
      }}
    >
      {children}
    </div>
  );
};

export const DocIconPicker = ({
  docId,
  readonly,
  headerAction,
}: {
  docId: string;
  readonly?: boolean;
  headerAction?: React.ReactNode;
}) => {
  const t = useI18n();
  const explorerIconService = useService(ExplorerIconService);
  const workspace = useService(WorkspaceService).workspace;
  const editorSetting = useService(EditorSettingService).editorSetting;

  const icon = useLiveData(explorerIconService.icon$('doc', docId));
  const settings = useLiveData(editorSetting.settings$);

  // Older icons only live in the explorer icon store. Mirror them when a page
  // opens so its linked database card can display the same icon immediately.
  useEffect(() => {
    if (readonly) return;
    const pageIcon = icon?.icon;
    if (pageIcon?.type !== 'emoji' && pageIcon?.type !== 'affine-icon') return;
    const meta = workspace.docCollection.meta;
    if (
      JSON.stringify(meta.getDocMeta(docId)?.pageIcon) !==
      JSON.stringify(pageIcon)
    ) {
      meta.setDocMeta(docId, { pageIcon });
    }
  }, [docId, icon?.icon, readonly, workspace]);

  const isPlaceholder = !icon?.icon;
  const shouldShowAddIconOption = settings.displayAddIconOption;

  if (readonly) {
    return isPlaceholder ? null : (
      <div
        className={styles.docIconPickerTrigger}
        data-icon-type={icon?.icon?.type}
      >
        <IconRenderer data={icon.icon} />
      </div>
    );
  }

  if (isPlaceholder && !shouldShowAddIconOption) {
    return headerAction ? (
      <TitleContainer hasIcon={false}>{headerAction}</TitleContainer>
    ) : null;
  }

  return (
    <TitleContainer hasIcon={!isPlaceholder}>
      <IconEditor
        icon={icon?.icon}
        onIconChange={data => {
          explorerIconService.setIcon({
            where: 'doc',
            id: docId,
            icon: data,
          });
          workspace.docCollection.meta.setDocMeta(docId, {
            pageIcon:
              data?.type === 'emoji' || data?.type === 'affine-icon'
                ? data
                : undefined,
          });
        }}
        closeAfterSelect={true}
        triggerVariant="plain"
        triggerClassName={
          isPlaceholder ? styles.placeholder : styles.docIconPickerTrigger
        }
        iconPlaceholder={
          <div className={styles.placeholderContent}>
            <SmileSolidIcon className={styles.placeholderContentIcon} />
            <span className={styles.placeholderContentText}>
              {t['com.affine.docIconPicker.placeholder']()}
            </span>
          </div>
        }
      />
      {headerAction}
    </TitleContainer>
  );
};
