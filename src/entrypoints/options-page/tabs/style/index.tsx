import { useOptionsPageState } from "../../state";
import { Toggle } from "/shared/components/toggle";

export const StyleTabContent = () => {
	const state = useOptionsPageState();

	return (
		<div>
			<Toggle checked={() => state.storage.widgetStyle.get() === 'transparent'} setChecked={checked => state.storage.setWidgetStyle(checked ? 'transparent' : 'contained')}>
				<div class="space-y-1">
					<div>
						Transparent quote widget background
					</div>
					<div class="text-secondary font-xs">
						Be aware this may affect the readability of the text if the widget dark/light mode setting does not match the site.
					</div>
				</div>
			</Toggle>
			<Toggle checked={() => state.storage.regionHideStyle.get() === 'blur'} setChecked={checked => state.storage.setRegionHideStyle(checked ? 'blur' : 'hidden')}>
				<div class="space-y-1">
					<div>
						Display hidden regions as blurred
					</div>
					<div class="text-secondary font-xs">
						If disabled, hidden regions will be completely invisible.
					</div>
				</div>
			</Toggle>
			<label class="flex cross-center p-4 gap-2">
				<span class="flex-1 space-y-1">
					<span class="block">Language of the built-in quotes</span>
					<span class="block text-secondary font-xs">Your own quotes are always shown.</span>
				</span>
				<select value={state.storage.quoteLanguage.get() ?? 'all'} onChange={e => state.storage.setQuoteLanguage(e.currentTarget.value as 'all' | 'en' | 'fr')}>
					<option value="all">English and Français</option>
					<option value="en">English</option>
					<option value="fr">Français</option>
				</select>
			</label>
		</div>
	);
};
