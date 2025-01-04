import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, DeviceEventEmitter, Image, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Video, { VideoRef } from 'react-native-video';
import { LinearGradient } from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { localData } from './Default';
import { last } from './Home/Home';

interface RouteParams {
	data: any;
}

const remote = {
	'left': 21,
	'right': 22,
	'up': 19,
	'down': 20,
	'return': 4,
	'confirm': 23,
}

let		timeoutOverlay: any = null;

function capitalize(val: string)
{
	for (let i = 0; i < val.length; i++)
	{
		while (i < val.length && /\s/.test(val[i]))
			i++;
		if (i === val.length)
			break;
		if (val[i] >= 'a' && val[i] <= 'z')
			val = val.substring(0, i) + val[i].toUpperCase() + val.substring(i + 1);
		while (i < val.length && !/\s/.test(val[i]))
			i++;
	}
    return (val);
}

const PlayerScreen = () => {
	const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();
	const { data } = route.params;
	const [stateData, setStateData] = useState<any>(data);
	const [urlVideo, setUrlVideo] = useState<string>('');
	const videoRef = React.useRef<VideoRef>(null);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const [totalTime, setTotalTime] = useState<number>(0);
	const [widthProgressBar, setWidthProgressBar] = useState<number>(0);
	const [hasError, setHasError] = useState<boolean>(false);
	const navigation = useNavigation();
	const [isPaused, setIsPaused] = useState<boolean>(false);
	const [onLoading, setOnLoading] = useState<boolean>(false);
	const [hideOverlay, setHideOverlay] = useState<boolean>(false);
	const [resolution, setResolution] = useState<string>('');
	const [selectedButton, setSelectedButton] = useState<number>(0); // 0: resume, 1: change source, 2: previous episode, 3: next episode, 4:return to menu
	const [episodeFinished, setEpisodeFinished] = useState<boolean>(false);

	const [source, setSource] = useState<string[]>([]);
	const [showSource, setShowSource] = useState<boolean>(false);
	const [sourceSelectedButton, setSourceSelectedButton] = useState<number>(0);
	const [sourceSelected, setSourceSelected] = useState<number>(0);
	const [typeSource, setTypeSource] = useState<string>('');

	const [timeToResume, setTimeToResume] = useState<number>(0);

	const [needRefresh, setNeedRefresh] = useState<boolean>(false);
	const [newValueEpisode, setNewValueEpisode] = useState<number>(0);

	const [sendRequest, setSendRequest] = useState<boolean>(false);

	useEffect(() => {
		const	pourcent = (currentTime / totalTime) * 100;

		setTimeout(() => {
			if (pourcent && !hasError && !isPaused && stateData.listUrlEpisodes !== undefined)
			{
				fetch(localData.addr + "/api/update_progress", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: stateData.back.id,
						episode: stateData.episode,
						totalEpisode: Object.keys(stateData.listUrlEpisodes).length,
						seasonId: stateData.selectedSeasons,
						allSeasons: stateData.season,
						progress: pourcent,
						poster: stateData.poster,
					})
				}).then((response) => {return response.json()})
				.then((stateData) => {
					setSendRequest(!sendRequest);
				})
				.catch((err) => {
					console.warn(err);
					setSendRequest(!sendRequest);
				});
			}
			else
				setSendRequest(!sendRequest);
		}, 10000);
	}, [sendRequest]);

	useEffect(() => {
		if (newValueEpisode == 0)
		{
			setNewValueEpisode(stateData.episode);
			return ;
		}
		setTotalTime(0);
		setCurrentTime(0);
		setWidthProgressBar(0);
		setOnLoading(true);
		setHideOverlay(true);
		setIsPaused(false);
		setShowSource(false);
		setSource([]);
		setSourceSelected(0);
		setSourceSelectedButton(0);
		setUrlVideo("");
		setTimeToResume(0);
		setEpisodeFinished(false);
		setHasError(false);
		setNeedRefresh(!needRefresh);
		setSource(stateData.listUrlEpisodes['eps' + newValueEpisode]);
		handleKeyPress({keycode: 0, screen: 'Player'});
	}, [newValueEpisode, stateData]);

	useEffect(() => {
		if (Object.keys(stateData.listUrlEpisodes).length === 0)
		{
			fetch(localData.addr + '/api/get_anime_episodes', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				}, 
				body: JSON.stringify({url: stateData.url, season: stateData.season[stateData.selectedSeasons], serverUrl: localData.addr}),
			}).then((response) => {
				return response.json();
			}).then((dataFetch) => {
				const newData = { ...stateData, listUrlEpisodes: dataFetch.episodes };
				console.log('newData: ', newData);
				setStateData(newData);
				
			}).catch((error) => {
				console.warn(error);
			});
			return ;
		}
		if (source.length == 0)
			return ;
		setHasError(false);
		fetch(source[sourceSelected], {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				serverUrl: localData.addr,
			})
		})
		.then((response) => {
			try {
				response.json().then((dataFetch) => {
					console.log(dataFetch);
					if (dataFetch.src === null)
					{
						setHasError(true);
						setUrlVideo("");
					}
					setTimeToResume(currentTime);
					if (dataFetch.src.includes('.mp4'))
						setTypeSource('video/mp4');
					else if (dataFetch.src.includes('.m3u8'))
						setTypeSource('m3u8');
					else
						setTypeSource('mpd');
					setUrlVideo(dataFetch.src);
				});
			}
			catch (error) {
				setHasError(true);
				setUrlVideo("");
			}
		}).catch((error) => {
			setHasError(true);
			setUrlVideo("");
		});
	}, [source, sourceSelected]);

	useEffect(() => {
		setWidthProgressBar((currentTime / totalTime) * 100);
	}, [currentTime]);

	const secondsToHms = (d: number) => {
		d = Number(d);
		const h = Math.floor(d / 3600);
		const m = Math.floor(d % 3600 / 60);
		const s = Math.floor(d % 3600 % 60);

		const hDisplay = h > 0 ? (h < 10 ? '0' + h : h) + ':' : '';
		const mDisplay = m > 0 ? (m < 10 ? '0' + m : m) + ':' : '00:';
		const sDisplay = s > 0 ? (s < 10 ? '0' + s : s) : '00';
		return (hDisplay + mDisplay + sDisplay);
	};

	const handleKeyPress = (keyData: any) => {
		const keycode = keyData.keycode;

		if (keyData.screen !== 'Player')
			return ;
		if (timeoutOverlay)
			clearTimeout(timeoutOverlay);
		if (!isPaused && !hasError && !episodeFinished)
		{
			setHideOverlay(false);
			timeoutOverlay = setTimeout(() => {
				setHideOverlay(true);
			}, 5000);
		}
		if (keycode == remote.confirm)	
		{
			setHideOverlay(true);
			if (!isPaused && !hasError && videoRef.current && !episodeFinished)
			{
				setIsPaused(!isPaused);
				setSelectedButton(0);
			}
			else
			{
				if (!showSource)
				{
					if (selectedButton == 0 && !hasError)
					{
						if (episodeFinished)
						{
							videoRef.current?.seek(0);
							setEpisodeFinished(false);
							setIsPaused(false);
						}
						else
							setIsPaused(!isPaused);
					}
					else if (selectedButton == 1 && !episodeFinished)
						setShowSource(true);
					else if (selectedButton == 2 && newValueEpisode > 1)
						setNewValueEpisode(newValueEpisode - 1);
					else if (selectedButton == 3 && newValueEpisode < Object.keys(stateData.listUrlEpisodes).length)
						setNewValueEpisode(newValueEpisode + 1);
					else if (selectedButton == 4)
					{
						last.selectedAnime = 2;
						navigation.reset({
							index: 1,
							routes: [
								{ name: 'Home' as never },
								{ name: 'Anime' as never, params: { anime: stateData.back } },
							],
						});
					}
				}
				else
				{
					if (sourceSelectedButton == source.length)
					{
						setSourceSelectedButton(sourceSelected);
						setShowSource(false);
					}
					else
					{
						setSourceSelected(sourceSelectedButton);
						setShowSource(false);
						setIsPaused(false);
					}
				}
			}
		}
		else if (!isPaused && !hasError && !episodeFinished)
		{
			if (keycode == remote.left && videoRef.current)
			{
				videoRef.current.seek(currentTime - localData.timeSkip);
				if (currentTime - localData.timeSkip < 0)
					setCurrentTime(0);
				else if (currentTime - localData.timeSkip > totalTime)
					setCurrentTime(totalTime);
				else
					setCurrentTime(currentTime - localData.timeSkip);
			}
			else if (keycode == remote.right && videoRef.current)
			{
				videoRef.current.seek(currentTime + localData.timeSkip);
				if (currentTime + localData.timeSkip < 0)
					setCurrentTime(0);
				else if (currentTime + localData.timeSkip > totalTime)
					setCurrentTime(totalTime);
				else
					setCurrentTime(currentTime + localData.timeSkip);
			}
			else if (keycode == remote.return)
			{
				last.selectedAnime = 2;
				navigation.reset({
					index: 1,
					routes: [
						{ name: 'Home' as never },
						{ name: 'Anime' as never, params: { anime: stateData.back } },
					],
				});
			}
		}
		else
		{
			if (keycode == remote.up)
			{
				if (!showSource)
				{
					if (selectedButton > 0)
						setSelectedButton(selectedButton - 1);
				}
				else
				{
					if (sourceSelectedButton > 0)
						setSourceSelectedButton(sourceSelectedButton - 1);
				}
			}
			else if (keycode == remote.down)
			{
				if (!showSource)
				{
					if (selectedButton < 4)
						setSelectedButton(selectedButton + 1);
				}
				else
				{
					if (sourceSelectedButton < source.length)
						setSourceSelectedButton(sourceSelectedButton + 1);
				}
			}
			else if (keycode == remote.return)
			{
				if (showSource)
				{
					setSourceSelectedButton(sourceSelected);
					setShowSource(false);
				}
				else
					setIsPaused(!isPaused);
			}
		}
		setNeedRefresh(!needRefresh);
	};

	DeviceEventEmitter.removeAllListeners('remoteKeyPress');
	DeviceEventEmitter.addListener('remoteKeyPress', handleKeyPress);

	return (
		<View style={styles.body}>
			{urlVideo && 
			<Video
				source={{ uri: urlVideo, type: typeSource }}
				ref={videoRef}
				style={styles.player}
				resizeMode="contain"
				onLoadStart={() => {
					setOnLoading(true);
					videoRef.current?.seek(timeToResume);
				}}
				onLoad={(dataLoad) => {
					setTotalTime(dataLoad.duration);
					setOnLoading(false);
					if (stateData.resumeTime)
						videoRef.current?.seek((stateData.resumeTime / 100) * dataLoad.duration);
					setResolution(dataLoad.naturalSize.width + 'x' + dataLoad.naturalSize.height);
				}}
				onProgress={(stateData) => {
					setCurrentTime(stateData.currentTime);
				}}
				onBuffer={(stateData) => {
					if (hasError)
						return ;
					setOnLoading(stateData.isBuffering);
				}}
				onError={(stateData) => {
					console.warn(stateData);
					setHasError(true);
				}}
				paused={isPaused}
				onEnd={() => {
					setEpisodeFinished(true);
					setHideOverlay(true);
				}}
			/>}
			{(isPaused || hasError || episodeFinished) &&
				<View style={[styles.overlay, {zIndex: 3}]}>
					<View style={styles.loadingBackground}></View>
					<View style={styles.logoContainer}>
						{stateData.logo &&
						<Image source={{uri: stateData.logo}} style={styles.logo} resizeMode='contain'/>
						}
					</View>
					<Text style={[styles.text, {textAlign: 'right', marginTop: 20, marginRight: 20}]}>{capitalize(String(stateData.season).split('/')[0])} - Episode {newValueEpisode}</Text>
					<Text style={[styles.text, {textAlign: 'right', marginRight: 20, color: "#ffffff90"}]}>{secondsToHms(currentTime)} / {secondsToHms(totalTime)}</Text>
					{!hasError ?
					<Text style={[styles.text, {textAlign: 'right', marginRight: 20, color: "#ffffff90"}]}>En pause</Text>
					:
					videoRef.current ?
					<Text style={[styles.text, {textAlign: 'center', position: 'absolute', top: 75, width: '100%', color: "#ff2222"}]}>Erreur lors du chargement de la vidéo{'\n'}Veuillez changer de source</Text>
					:
					<Text style={[styles.text, {textAlign: 'center', position: 'absolute', top: 75, width: '100%', color: "#ff2222"}]}>Serveur introuvable, veuillez vérifier votre connexion internet</Text>
					}
					{episodeFinished &&
					<Text style={[styles.text, {textAlign: 'center', position: 'absolute', top: 75, width: '100%', color: "#ffffff"}]}>Episode terminé</Text>
					}
					{!showSource ?
						<View style={{position: 'absolute', top: '32%'}}>
							<Text style={[styles.text, {padding: 5, marginLeft: 20 , color: !hasError ? "#fff" : "#555555"},selectedButton == 0 ? styles.selected : null]}>{episodeFinished ? "Recommencer" : "Reprendre"}</Text>
							<Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5, color: !episodeFinished ? "#fff" : "#555555"},selectedButton == 1 ? styles.selected : null]}>Changer de source</Text>
							<Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5, color: newValueEpisode > 1 ? "#fff" : "#555555"},selectedButton == 2 ? styles.selected : null]}>Episode précédent</Text>
							<Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5, color: newValueEpisode < Object.keys(stateData.listUrlEpisodes).length ? "#fff" : "#555555"},selectedButton == 3 ? styles.selected : null]}>Episode suivant</Text>
							<Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5},selectedButton == 4 ? styles.selected : null]}>Retour au menu</Text>
						</View>
						:
						<View style={{position: 'absolute', top: '35%'}}>
							{source[0] && <Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginBlock: 'auto'},sourceSelectedButton == 0 ? styles.selected : null]}>Source 1</Text>}
							{source[1] && <Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5},sourceSelectedButton == 1 ? styles.selected : null]}>Source 2</Text>}
							{source[2] && <Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5},sourceSelectedButton == 2 ? styles.selected : null]}>Source 3</Text>}
							{source[3] && <Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5},sourceSelectedButton == 3 ? styles.selected : null]}>Source 4</Text>}
							<Text style={[styles.text, {padding: 5, marginLeft: 20 ,marginTop: 5},sourceSelectedButton == source.length ? styles.selected : null]}>Retour</Text>
						</View>
					}
					<Text style={[styles.text, {textAlign: 'right', position: 'absolute', bottom: 5, right: 0, width: '100%', color: "#ffffff90", fontSize: 16}]}>{resolution}</Text>
				</View>
			}
			{onLoading && !hasError &&
				<View style={styles.overlay}>
					<View style={styles.loadingBackground}></View>
					<View style={styles.logoContainer}>
						{stateData.logo &&
						<Image source={{uri: stateData.logo}} style={styles.logo} resizeMode='contain'/>
						}
						<ActivityIndicator color="#fff" style={styles.loadingCircle} size={500}/>
					</View>
				</View>
			}
			<View style={[styles.overlay, {display: hideOverlay ? 'none' : 'flex'}]}>
				<LinearGradient
					colors={
						['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0)']
					}
					style={styles.gradientOverlay}
					start={{ x: 0, y: 0 }}
					end={{ x: 0, y: 0.1 }}
				/>
				<LinearGradient
					colors={
						['rgba(0, 0, 0, 0)', 'rgba(34, 34, 34, 1)']
					}
					style={styles.gradientOverlay}
					start={{ x: 0, y: 0.8 }}
					end={{ x: 0, y: 1 }}
				/>
				<View style={styles.topOverlay}>
					<Text style={styles.text}>{capitalize(stateData.title.length > 50 ? stateData.title.substring(0, 50) + '...' : stateData.title)}</Text>
					<Text style={styles.text}>{capitalize(String(stateData.season[stateData.selectedSeasons]).split('/')[0])} - Episode {newValueEpisode}</Text>
				</View>
				<View style={styles.bottomOverlay}>
					<Text style={styles.text}>{secondsToHms(currentTime)}</Text>
					<View style={styles.progressBar}>
						<View style={[styles.progressBarColor, {width: `${widthProgressBar}%`}]}></View>
					</View>
					<Text style={styles.text}>{secondsToHms(totalTime)}</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	body: {
		flex: 1,
		backgroundColor: '#333',
		alignItems: 'center',
		justifyContent: 'center',
	},
	player:{
		backgroundColor: 'black',
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		width: '100%',
		height: '100%',
	},
	gradientOverlay: {
		...StyleSheet.absoluteFillObject,
	},
	topOverlay: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		position: 'absolute',
		width: '100%',
		zIndex: 2,
	},
	bottomOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		width: '99%',
		zIndex: 2,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		alignContent: 'center',
		height: 70,
		padding: 20,
	},
	text: {
		fontSize: 20,
		color: '#fff',
		fontWeight: 'bold',
		textShadowColor: 'rgba(0, 0, 0, 0.5)',
		textShadowOffset: { width: -1, height: 1 },
		marginInline: 10,
		textShadowRadius: 10,
	},
	progressBar: {
		backgroundColor: 'rgba(255, 255, 255, 0.5)',
		height: 10,
		borderRadius: 5,
		flex: 1,
		marginTop: 1,
		overflow: 'hidden',
	},
	progressBarColor: {
		backgroundColor: 'white',
		borderRadius: 5,
		height: '100%',
	},
	logoContainer: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		width: 400,
		height: 400,
		transform: [{translateX: -200}, {translateY: -200}],
	},
	logo: {
		width: 350,
		height: 350,
		marginLeft: 25,
		marginTop: 25,
		zIndex: 3,
	},
	loadingCircle: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		zIndex: 2,
		transform: [{translateX: -250}, {translateY: -250}],
	},
	loadingBackground: {
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		zIndex: 0,
		width: '100%',
		height: '100%',
		position: 'absolute'
	},
	selected: {
		backgroundColor: 'rgba(255, 255, 255, 0.5)',
		borderRadius: 5,
		width: 250,
		marginInline: 'auto',
	}
});

export default PlayerScreen;