import React, { Component }from 'react';
import { Text, View, TextInput, Button, Image } from 'react-native';
import Storage from '@aws-amplify/storage'

// import the Analytics category
import Analytics from '@aws-amplify/analytics'
import Auth from '@aws-amplify/auth';

import { withAuthenticator } from 'aws-amplify-react-native'

import * as ImagePicker from 'expo-image-picker';
import * as Permissions from 'expo-permissions';
import mime from 'mime-types';

import Amplify from "aws-amplify";
import awsExports from './src/aws-exports';
Amplify.configure(awsExports);

import styles from './style';

import API, { graphqlOperation } from '@aws-amplify/api'

const listPets = `
  query {
    listPet {
      items {
        id
        name
        description
      }
    }
 }
`
const createPet = `
  mutation($name: String!, $description: String) {
    createPet(input: {
      name: $name
      description: $description
  }) {
    id
    name
    description
  }
}`


class App extends Component {

  state = { 
    name: '', 
    description: '', 
    pets: [], 
    user: {}
  }

  async componentDidMount() {
    try {
      const graphqldata = await API.graphql(graphqlOperation(listPets))
      this.setState({ pets: graphqldata.data.listPet.items })
    } catch (err) {
      console.log('error: ', err)
    }
  }

  onChangeText = (key, val) => {
    this.setState({ [key]: val })
  }

  createPet = async () => {
    const pet = this.state
  
    const user = await Auth.currentAuthenticatedUser()
    if (pet.name === '' || pet.description === '') return
    
    const pets = [...this.state.pets, pet]
    
    this.setState({ 
        pets, 
        name: '', 
        url: '',
        description: '', 
        user 
      });

    try {
      await API.graphql(graphqlOperation(createPet, pet))
      Analytics.record({ name: "Button Clicked!", attributes: { username: this.state.user.username} })
      console.log('pet successfully created.')
    } catch (err) {
      Analytics.record({ name: "Button Clicked!", attributes: { username: this.state.user.username} })
      console.log('error creating pet...', err)
    }
  }

  pickImage = async () => {
    const {
      status: cameraRollPerm
    } = await Permissions.askAsync(Permissions.CAMERA_ROLL);  if (cameraRollPerm === 'granted') {
      let pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
      });
      this.handleImagePicked(pickerResult);
    }
  };

  handleImagePicked = async (pickerResult) => {
    const imageName = pickerResult.uri.replace(/^.*[\\\/]/, '');
    const fileType = mime.lookup(pickerResult.uri);
    const access = { level: "public", contentType: 'image/jpeg' };
    const imageData = await fetch(pickerResult.uri)
    const blobData = await imageData.blob()
    
    try {
      await Storage.put(imageName, blobData, access)

      const image = await Storage.get(imageName);
      this.setState({
        url: image,
      })
    } catch (err) {
      console.log('error: ', err)
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          onChangeText={val => this.onChangeText('name', val)}
          placeholder="Pet Name"
          value={this.state.name}
        />
        <TextInput
          style={styles.input}
          onChangeText={val => this.onChangeText('description', val)}
          placeholder="Pet Description"
          value={this.state.description}
        />
        <Button onPress={this.createPet} title="Add Pet" />
        <Button onPress={this.pickImage} title="PICK PICK" />
        {
          this.state.pets.map((pet, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.name}>{pet.name}</Text>
              <Text style={styles.description}>{pet.description}</Text>
              <Image style={{height: 50, width: 50 }} source={{ uri: pet.url }} />
            </View>
          ))
        }
      </View>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true })
